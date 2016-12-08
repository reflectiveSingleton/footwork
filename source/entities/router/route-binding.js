var fw = require('knockout/build/output/knockout-latest');
var _ = require('footwork-lodash');

var util = require('../../misc/util');
var hasPathStart = util.hasPathStart;
var hasHashStart = util.hasHashStart;
var resultBound  = util.resultBound;
var startingHashRegex = util.startingHashRegex;
var removeClass = util.removeClass;
var addClass = util.addClass;
var hasClass = util.hasClass;
var privateDataSymbol = util.getSymbol('footwork');

var routerTools = require('./router-tools');
var nearestParentRouter = routerTools.nearestParentRouter;
var isNullRouter = routerTools.isNullRouter;

var isFullURLRegex = /(^[a-z]+:\/\/|^\/\/)/i;
var isFullURL = fw.utils.isFullURL = function (thing) {
  return _.isString(thing) && isFullURLRegex.test(thing);
};

fw.bindingHandlers.$route = {
  init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
    var router = nearestParentRouter(bindingContext);
    var routeParams = valueAccessor();
    var elementIsSetup = false;
    var stateTracker = null;
    var hashOnly = null;

    var routeHandlerDescription = {
      on: 'click',
      url: function defaultURLForRoute () { return element.getAttribute('href'); },
      activeClass: fw.router.activeClass,
      history: 'push',
      handler: function defaultHandlerForRouteBinding (event, url) {
        /* istanbul ignore else */
        if (!hashOnly && !isFullURL(url) && event.which !== 2) {
          event.preventDefault();
          return true;
        } else {
          return false;
        }
      }
    };

    if (_.isFunction(routeParams) || _.isString(routeParams)) {
      routeHandlerDescription.url = routeParams;
    } else if (_.isObject(routeParams)) {
      _.extend(routeHandlerDescription, routeParams);
    }

    var routeHandlerDescriptionURL = routeHandlerDescription.url;
    if (!_.isFunction(routeHandlerDescriptionURL)) {
      routeHandlerDescription.url = function () { return routeHandlerDescriptionURL; };
    }

    function getRouteURL () {
      var routeURL = routeHandlerDescription.url();

      if (!isFullURL(routeURL) && hasHashStart(routeURL)) {
        var currentRoute = router[privateDataSymbol].currentRoute();
        if (currentRoute) {
          routeURL = currentRoute.segment + routeURL;
        }
      }

      return routeURL;
    };

    function checkForMatchingSegment (mySegment, newRoute) {
      if (_.isString(mySegment)) {
        var currentRoute = router[privateDataSymbol].currentRoute();
        var activeRouteClassName = resultBound(routeHandlerDescription, 'activeClass', router);

        if (_.isObject(currentRoute)) {
          if (_.isString(activeRouteClassName) && activeRouteClassName.length) {
            if (mySegment === '/') {
              mySegment = '';
            }

            if (!_.isNull(newRoute) && newRoute.segment === mySegment) {
              // newRoute.segment is the same as this routers segment...add the activeRouteClassName to the element to indicate it is active
              addClass(element, activeRouteClassName);
            } else if (hasClass(element, activeRouteClassName)) {
              removeClass(element, activeRouteClassName);
            }
          }
        }
      }

      if (_.isNull(newRoute)) {
        // No route currently selected, remove the activeRouteClassName from the element
        removeClass(element, activeRouteClassName);
      }
    };

    function setUpElement () {
      if (!isNullRouter(router)) {
        var myCurrentSegment = getRouteURL();
        var configParams = router[privateDataSymbol].configParams;
        if (element.tagName.toLowerCase() === 'a') {
          element.href = configParams.baseRoute + getRouteURL();
        }

        if (_.isObject(stateTracker) && _.isFunction(stateTracker.dispose)) {
          stateTracker.dispose();
        }
        stateTracker = router[privateDataSymbol].currentRoute.subscribe(_.partial(checkForMatchingSegment, myCurrentSegment));

        if (elementIsSetup === false) {
          elementIsSetup = true;
          checkForMatchingSegment(myCurrentSegment, router[privateDataSymbol].currentRoute());

          fw.utils.registerEventHandler(element, resultBound(routeHandlerDescription, 'on', router), function (event) {
            var currentRouteURL = getRouteURL();
            var handlerResult = routeHandlerDescription.handler.call(viewModel, event, currentRouteURL);
            if (handlerResult) {
              if (_.isString(handlerResult)) {
                currentRouteURL = handlerResult;
              }
              if (_.isString(currentRouteURL) && !isFullURL(currentRouteURL)) {
                router[resultBound(routeHandlerDescription, 'history', router) + 'State'](currentRouteURL);
              }
            }
            return true;
          });
        }
      }
    }

    if (fw.isObservable(routeHandlerDescription.url)) {
      router.disposeWithInstance(routeHandlerDescription.url.subscribe(setUpElement));
    }
    setUpElement();

    /* istanbul ignore next */
    fw.utils.domNodeDisposal.addDisposeCallback(element, function () {
      if (_.isObject(stateTracker)) {
        stateTracker.dispose();
      }
    });
  }
};
