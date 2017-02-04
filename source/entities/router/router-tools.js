var fw = require('knockout/build/output/knockout-latest');
var _ = require('footwork-lodash');

var nearestEntity = require('../entity-tools').nearestEntity;

var util = require('../../misc/util');
var getSymbol = util.getSymbol;
var resultBound = util.resultBound;
var alwaysPassPredicate = util.alwaysPassPredicate;
var privateDataSymbol = util.getSymbol('footwork');

var optionalParamRegex = /\((.*?)\)/g;
var namedParamRegex = /(\(\?)?:\w+/g;
var requiredNamedParamRegex = /\/:(\w+)/g;
var removeOptionalParamRegex = /\(\/:\w+\)/g;
var splatParamRegex = /\*\w*/g;
var escapeRegex = /[\-{}\[\]+?.,\\\^$|#\s]/g;

// Convert a route string to a regular expression which is then used to match a uri against it and determine
// whether that uri matches the described route as well as parse and retrieve its tokens
function routeStringToRegExp (routeString) {
  routeString = routeString
    .replace(escapeRegex, "\\$&")
    .replace(optionalParamRegex, "(?:$1)?")
    .replace(namedParamRegex, function (match, optional) {
      return optional ? match : "([^\/]+)";
    })
    .replace(splatParamRegex, "(.*?)");

  return new RegExp('^' + routeString + (routeString !== '/' ? '(\\/.*)*$' : '$'));
}

/**
 * Locate the nearest router from a given ko $context
 * (travels up through $parentContext chain to find the router if not found on the
 * immediate $context). Returns null if none is found.
 *
 * @param {object} $context
 * @returns {object} router instance or null if none found
 */
function nearestParentRouter ($context) {
  return nearestEntity($context.$parentContext, fw.isRouter);
}

/**
 * Register an outlets viewModel with its parent router.
 *
 * @param {object} router the router to register with
 * @param {string} outletName the name (property) of the outlet
 * @param {object} outletViewModel the outlets viewModel to register with the router
 */
function registerOutlet (router, outletName, outletViewModel) {
  var outletProperties = router[privateDataSymbol].outlets[outletName] = router[privateDataSymbol].outlets[outletName] || {};
  outletProperties.outletViewModel = outletViewModel;
}

/**
 * Unregister an outlets viewModel from its associated router.
 *
 * @param {object} router the router to unregister from
 * @param {string} outletName the name (property) of the outlet
 */
function unregisterOutlet (router, outletName) {
  delete router[privateDataSymbol].outlets[outletName];
}

/**
 * Remove the begging portion of a url so that when matching routes we do not need to specify it in each one
 *
 * @param {object} router the router
 * @param {string} url portion of url to ignore
 */
function trimBaseRoute (router, url) {
  var baseRoute = router[privateDataSymbol].configParams.baseRoute;
  if (baseRoute && url && url.indexOf(baseRoute) === 0) {
    url = url.substr(baseRoute.length);
  }
  return url;
}

/**
 * Remove the query string and hash from a url
 *
 * @param {string} url The url to remove the query string and hash from
 * @returns {string} the stripped url
 */
function stripQueryStringAndFragment (url) {
  if (url) {
    return url.split("?")[0].split("#")[0];
  } else {
    return url;
  }
}

function getRouteParams (route, routeUrl, destinationUrl) {
  var paramNames = _.map(routeUrl.match(namedParamRegex), function (param) {
    return param.replace(':', '');
  });
  var paramValues = destinationUrl.match(routeStringToRegExp(routeUrl));

  return _.reduce(paramNames, function (routeParams, parameterName, index) {
    routeParams[parameterName] = stripQueryStringAndFragment(paramValues[index + 1]);
    return routeParams;
  }, {});
}

function getNamedRoute (router, namedRoute) {
  return _.reduce(router.routes(), function (foundNamedRoute, route) {
    if (route.name === namedRoute.name) {
      foundNamedRoute = {
        route: route,
        params: namedRoute.params
      };
    }
    return foundNamedRoute;
  }, null);
}

function getMatchedRoute (router, destinationUrl) {
  destinationUrl = trimBaseRoute(router, stripQueryStringAndFragment(destinationUrl));

  return _.reduce(router.routes(), function (matchedRoute, routeConfiguration) {
    var path = routeConfiguration.path;
    if (_.isString(path) || _.isArray(path)) {
      _.each([].concat(path), function (routePath) {
        if (_.isString(routePath) && _.isString(destinationUrl) && destinationUrl.match(routeStringToRegExp(routePath))) {
          matchedRoute = {
            route: routeConfiguration,
            params: getRouteParams(routeConfiguration, routePath, destinationUrl)
          };
        }
      });
    }
    return matchedRoute;
  }, null);
}

/**
 * Change the route on the specified router to the specified route.
 *
 * @param {object} router The router instance to manipulate
 * @param {string} historyMethod push/replace the url onto the history stack (if using history)
 * @param {string} route The desired route to change to
 * @returns {object} the router
 */
function changeState (router, historyMethod, newState) {
  if (router.activated()) {
    var configParams = router[privateDataSymbol].configParams;
    var routeUrl;
    var route;

    if (_.isObject(newState)) {
      // find named route
      route = getNamedRoute(router, newState);

      if (route && route.route.path) {
        // render the url of the named route to store in the currentState
        routeUrl = route.route.path;
        _.each(newState.params, function (value, fieldName) {
          routeUrl = routeUrl.replace(':' + fieldName, newState.params[fieldName]);
        });
      }
    } else if (!fw.utils.isFullURL(newState)) {
      route = router.getRouteForState(newState);
      routeUrl = newState;
    }

    if (route && (route.predicate || alwaysPassPredicate).call(router, newState) && configParams.predicate.call(router, newState)) {
      /* istanbul ignore if */
      if (historyMethod && !fw.router.disableHistory) {
        history[historyMethod + 'State'](newState, null, (routeUrl ? configParams.baseRoute + routeUrl : null));
      }

      router.currentState(newState);
    }
  }

  return router;
}

/**
 * Returns the current location of the browser, including the query string and hash portions
 *
 * @returns {string} the current location url
 */
function getLocation () {
  var location = window.history.location || window.location;
  return location.pathname + location.search + location.hash;
}

module.exports = {
  nearestParentRouter: nearestParentRouter,
  registerOutlet: registerOutlet,
  unregisterOutlet: unregisterOutlet,
  changeState: changeState,
  getNamedRoute: getNamedRoute,
  getMatchedRoute: getMatchedRoute,
  getLocation: getLocation,
  stripQueryStringAndFragment: stripQueryStringAndFragment
};
