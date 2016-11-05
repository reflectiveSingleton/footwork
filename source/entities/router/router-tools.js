var _ = require('lodash');

var nearestEntity = require('../entity-tools').nearestEntity;
var privateDataSymbol = require('../../misc/config').privateDataSymbol;

var util = require('../../misc/util');
var getSymbol = util.getSymbol;
var resultBound = util.resultBound;
var alwaysPassPredicate = util.alwaysPassPredicate;

var routerDefaults = require('./router-defaults');
var nullRouter = routerDefaults.nullRouter;
var routesAreCaseSensitive = routerDefaults.routesAreCaseSensitive;
var baseRoute = routerDefaults.baseRoute;

var optionalParamRegex = /\((.*?)\)/g;
var namedParamRegex = /(\(\?)?:\w+/g;
var splatParamRegex = /\*\w*/g;
var escapeRegex = /[\-{}\[\]+?.,\\\^$|#\s]/g;
var hashMatchRegex = /(^\/#)/;

function sameRouteDescription (desc1, desc2) {
  return desc1.routeDescription === desc2.routeDescription && _.isEqual(desc1.indexedParams, desc2.indexedParams) && _.isEqual(desc1.namedParams, desc2.namedParams);
}

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

  return new RegExp('^' + routeString + (routeString !== '/' ? '(\\/.*)*$' : '$'), routesAreCaseSensitive ? undefined : 'i');
}

function isNullRouter (thing) {
  return _.isObject(thing) && !!thing[getSymbol('isNullRouter')];
}

function isRoute (thing) {
  return _.isObject(thing) && !!thing.__isRoute;
}

/**
 * Locate the nearest router from a given ko $context
 * (travels up through $parentContext chain to find the router if not found on the
 * immediate $context). Returns nullRouter if none is found.
 *
 * @param {object} $context
 * @returns {object} router instance or nullRouter if none found
 */
function nearestParentRouter ($context) {
  return nearestEntity($context.$parentContext, fw.isRouter) || nullRouter;
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

function trimBaseRoute (router, url) {
  var configParams = router[privateDataSymbol].configParams;
  if (configParams.baseRoute && url.indexOf(configParams.baseRoute) === 0) {
    url = url.substr(configParams.baseRoute.length);
    if (url.length > 1) {
      url = url.replace(hashMatchRegex, '/');
    }
  }
  return url;
}

function triggerRoute (router, routeDescription) {
  if (isRoute(routeDescription)) {
    if (!_.isUndefined(routeDescription.title)) {
      window.document.title = _.isFunction(routeDescription.title) ? routeDescription.title.apply(router, _.values(routeDescription.namedParams)) : routeDescription.title;
    }

    if (_.isUndefined(router[privateDataSymbol].currentRouteDescription) || !sameRouteDescription(router[privateDataSymbol].currentRouteDescription, routeDescription)) {
      routeDescription.controller.apply(router, _.values(routeDescription.namedParams));
      router[privateDataSymbol].currentRouteDescription = routeDescription;
    }
  }
}

/**
 * Change the route on the specified router to the specified route using the specified historyMethod and routeParams
 *
 * @param {object} router The router instance to manipulate
 * @param {string} historyMethod push/replace the url onto the history stack (if using history)
 * @param {string} route The desired route to change to
 * @param {object} routeParams (optional) parameters to pass to the route controller
 * @returns {object} the router
 */
function changeRoute (router, historyMethod, route, routeParams) {
  if(router.$activated()) {
    var namedRoute = _.isObject(routeParams) ? route : null;
    var configParams = router[privateDataSymbol].configParams;
    route = route;

    if (!_.isNull(namedRoute)) {
      // must convert namedRoute into its URL form
      var routeDescription = _.find(router.$routes(), function (route) {
        return route.name === namedRoute;
      });

      if (!_.isUndefined(routeDescription)) {
        // render the url of the named route to store in the $currentState
        route = routeDescription.route;
        _.each(routeParams, function (value, fieldName) {
          route = route.replace(':' + fieldName, routeParams[fieldName]);
        });
      } else {
        throw new Error('Could not locate named route: ' + namedRoute);
      }
    }

    if (!fw.utils.isFullURL(route)) {
      route = trimBaseRoute(router, route);

      if (resultBound(configParams, 'beforeRoute', router, [route || '/'])) {
        if (!router[privateDataSymbol].activating && route && router[privateDataSymbol].historyPopstateListener() && !fw.router.disableHistory()) {
          history[historyMethod + 'State'](null, '', configParams.baseRoute + route);
        }
        router.$currentState(route);
      }
    }
  }

  return router;
}

/**
 * Remove the query string and hash from a url
 *
 * @param {string} url The url to remove the query string and hash from
 * @returns {string} the stripped url
 */
function stripQueryStringAndHashFromPath (url) {
  if(url) {
    return url.split("?")[0].split("#")[0];
  } else {
    return url;
  }
}

function getUnknownRoute (routes) {
  var unknownRoute = _.find(routes.reverse(), { unknown: true }) || null;

  if (!_.isNull(unknownRoute)) {
    unknownRoute = _.extend({}, baseRoute, {
      controller: unknownRoute.controller,
      title: unknownRoute.title,
      segment: '',
      routeDescription: unknownRoute
    });
  }

  return unknownRoute;
}

function getRouteForURL (router, routes, url) {
  var route = null;
  var unknownRoute = getUnknownRoute(routes);
  var matchedRoutes = [];

  // find all routes with a matching routeString
  if(routes) {
    matchedRoutes = _.reduce(routes, function (matches, routeDescription) {
      var routeDescRoute = [].concat(routeDescription.route);
      _.each(routeDescRoute, function (routeString) {
        var routeParams = [];

        if (_.isString(routeString) && _.isString(url)) {
          routeParams = url.match(routeStringToRegExp(routeString));
          if (!_.isNull(routeParams) && (routeDescription.filter || alwaysPassPredicate).call(router, routeParams)) {
            matches.push({
              routeString: routeString,
              specificity: routeString.replace(namedParamRegex, "*").length,
              routeDescription: routeDescription,
              routeParams: routeParams
            });
          }
        }
      });
      return matches;
    }, []);
  }

  // If there are matchedRoutes, find the one with the highest 'specificity' (longest normalized matching routeString)
  // and convert it into the actual route
  if (matchedRoutes.length) {
    var matchedRoute = _.reduce(matchedRoutes, function (matchedRoute, foundRoute) {
      if (_.isNull(matchedRoute) || foundRoute.specificity > matchedRoute.specificity) {
        matchedRoute = foundRoute;
      }
      return matchedRoute;
    }, null);
    var routeDescription = matchedRoute.routeDescription;
    var routeString = matchedRoute.routeString;
    var routeParams = _.clone(matchedRoute.routeParams);
    var splatSegment = routeParams.pop() || '';
    var routeParamNames = _.map(routeString.match(namedParamRegex), function (param) {
      return param.replace(':', '');
    });
    var namedParams = _.reduce(routeParamNames, function (parameterNames, parameterName, index) {
      parameterNames[parameterName] = routeParams[index + 1];
      return parameterNames;
    }, {});

    route = _.extend({}, baseRoute, {
      controller: routeDescription.controller,
      title: routeDescription.title,
      name: routeDescription.name,
      url: url,
      segment: url.substr(0, url.length - splatSegment.length),
      indexedParams: routeParams,
      namedParams: namedParams,
      routeDescription: routeDescription
    });
  }

  return route || unknownRoute;
}

module.exports = {
  namedParamRegex: namedParamRegex,
  hashMatchRegex: hashMatchRegex,
  sameRouteDescription: sameRouteDescription,
  routeStringToRegExp: routeStringToRegExp,
  isNullRouter: isNullRouter,
  isRoute: isRoute,
  nearestParentRouter: nearestParentRouter,
  registerOutlet: registerOutlet,
  unregisterOutlet: unregisterOutlet,
  trimBaseRoute: trimBaseRoute,
  changeRoute: changeRoute,
  stripQueryStringAndHashFromPath: stripQueryStringAndHashFromPath,
  getUnknownRoute: getUnknownRoute,
  getRouteForURL: getRouteForURL,
  triggerRoute: triggerRoute
};
