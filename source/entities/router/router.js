var fw = require('../../../bower_components/knockoutjs/dist/knockout');
var _ = require('../../misc/lodash');

var entityDescriptors = require('../entity-descriptors');
var entityTools = require('../entity-tools');
var ViewModel = require('../viewModel/viewModel');
var routerOutlet = require('./outlet/outlet');

var resultBound = require('../../misc/util').resultBound;

require('./route-binding');

var routerTools = require('./router-tools');
var hashMatchRegex = routerTools.hashMatchRegex;
var namedParamRegex = routerTools.namedParamRegex;
var isNullRouter = routerTools.isNullRouter;
var transformRouteConfigToDesc = routerTools.transformRouteConfigToDesc;
var sameRouteDescription = routerTools.sameRouteDescription;
var routeStringToRegExp = routerTools.routeStringToRegExp;
var historyIsReady = routerTools.historyIsReady;
var isRoute = routerTools.isRoute;
var nearestParentRouter = routerTools.nearestParentRouter;

var routerDefaults = require('./router-defaults');
var noComponentSelected = routerDefaults.noComponentSelected;
var $nullRouter = routerDefaults.$nullRouter;
var baseRoute = routerDefaults.baseRoute;

function registerViewModelForOutlet(outletName, outletViewModel) {
  var outletProperties = this.outlets[outletName] || {};
  outletProperties.outletViewModel = outletViewModel;
}

function unregisterViewModelForOutlet(outletName) {
  var outletProperties = this.outlets[outletName] || {};
  delete outletProperties.outletViewModel;
}

var Router = module.exports = function Router(descriptor, configParams) {
  return {
    _preInit: function(params) {
      var $router = this;
      var routerConfigParams = extend({ routes: [] }, configParams);

      var router = this.__private();
      this.__private = privateData.bind(this, router, routerConfigParams);
      this.__private('registerViewModelForOutlet', registerViewModelForOutlet.bind(this));
      this.__private('unregisterViewModelForOutlet', unregisterViewModelForOutlet.bind(this));

      routerConfigParams.baseRoute = fw.router.baseRoute() + (resultBound(routerConfigParams, 'baseRoute', router) || '');

      var subscriptions = router.subscriptions = fw.observableArray();
      router.urlParts = fw.observable();
      router.childRouters = fw.observableArray();
      router.parentRouter = fw.observable($nullRouter);
      router.context = fw.observable();
      router.historyIsEnabled = fw.observable(false);
      router.disableHistory = fw.observable().receiveFrom(this.$globalNamespace, 'disableHistory');
      router.currentState = fw.observable('').broadcastAs('currentState');

      function trimBaseRoute(url) {
        var routerConfig = $router.__private('configParams');
        if (!_.isNull(routerConfig.baseRoute) && url.indexOf(routerConfig.baseRoute) === 0) {
          url = url.substr(routerConfig.baseRoute.length);
          if (url.length > 1) {
            url = url.replace(hashMatchRegex, '/');
          }
        }
        return url;
      }

      function normalizeURL(url) {
        var urlParts = parseUri(url);
        router.urlParts(urlParts);

        if (!fw.router.html5History()) {
          if (url.indexOf('#') !== -1) {
            url = '/' + urlParts.anchor.replace(startingSlashRegex, '');
          } else if (router.currentState() !== url) {
            url = '/';
          }
        } else {
          url = urlParts.path;
        }

        return trimBaseRoute(url);
      }
      router.normalizeURL = normalizeURL;

      function getUnknownRoute() {
        var unknownRoute = _.find(($router.routeDescriptions || []).reverse(), { unknown: true }) || null;

        if (!_.isNull(unknownRoute)) {
          unknownRoute = extend({}, baseRoute, {
            id: unknownRoute.id,
            controller: unknownRoute.controller,
            title: unknownRoute.title,
            segment: ''
          });
        }

        return unknownRoute;
      }

      function getRouteForURL(url) {
        var route = null;
        var parentRoutePath = router.parentRouter().path() || '';
        var unknownRoute = getUnknownRoute();

        // If this is a relative router we need to remove the leading parentRoutePath section of the URL
        if (router.isRelative() && parentRoutePath.length > 0 && (routeIndex = url.indexOf(parentRoutePath + '/')) === 0) {
          url = url.substr(parentRoutePath.length);
        }

        // find all routes with a matching routeString
        var matchedRoutes = reduce($router.routeDescriptions, function (matches, routeDescription) {
          var routeDescRoute = [].concat(routeDescription.route);
          _.each(routeDescRoute, function (routeString) {
            var routeParams = [];

            if (_.isString(routeString) && _.isString(url)) {
              routeParams = url.match(routeStringToRegExp(routeString));
              if (!_.isNull(routeParams) && routeDescription.filter.call($router, routeParams, router.urlParts.peek())) {
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

        // If there are matchedRoutes, find the one with the highest 'specificity' (longest normalized matching routeString)
        // and convert it into the actual route
        if (matchedRoutes.length) {
          var matchedRoute = reduce(matchedRoutes, function(matchedRoute, foundRoute) {
            if (_.isNull(matchedRoute) || foundRoute.specificity > matchedRoute.specificity) {
              matchedRoute = foundRoute;
            }
            return matchedRoute;
          }, null);
          var routeDescription = matchedRoute.routeDescription;
          var routeString = matchedRoute.routeString;
          var routeParams = clone(matchedRoute.routeParams);
          var splatSegment = routeParams.pop() || '';
          var routeParamNames = map(routeString.match(namedParamRegex), function(param) {
            return param.replace(':', '');
          });
          var namedParams = reduce(routeParamNames, function(parameterNames, parameterName, index) {
            parameterNames[parameterName] = routeParams[index + 1];
            return parameterNames;
          }, {});

          route = extend({}, baseRoute, {
            id: routeDescription.id,
            controller: routeDescription.controller,
            title: routeDescription.title,
            name: routeDescription.name,
            url: url,
            segment: url.substr(0, url.length - splatSegment.length),
            indexedParams: routeParams,
            namedParams: namedParams
          });
        }

        return route || unknownRoute;
      }

      function RoutedAction(routeDescription) {
        if (!_.isUndefined(routeDescription.title)) {
          document.title = _.isFunction(routeDescription.title) ? routeDescription.title.apply($router, values(routeDescription.namedParams)) : routeDescription.title;
        }

        if (_.isUndefined(router.currentRouteDescription) || !sameRouteDescription(router.currentRouteDescription, routeDescription)) {
          (routeDescription.controller || _.noop).apply($router, values(routeDescription.namedParams) );
          router.currentRouteDescription = routeDescription;
        }
      }

      function getActionForRoute(routeDescription) {
        var Action = function DefaultAction() {
          delete router.currentRouteDescription;
          $router.outlet.reset();
        };

        if (isRoute(routeDescription)) {
          Action = RoutedAction.bind($router, routeDescription);
        }

        return Action;
      }

      router.isRelative = fw.computed(function() {
        return routerConfigParams.isRelative && !isNullRouter( this.parentRouter() );
      }, router);

      this.currentRoute = router.currentRoute = fw.computed(function() {
        return getRouteForURL(normalizeURL(this.currentState()));
      }, router);

      this.path = router.path = fw.computed(function() {
        var currentRoute = this.currentRoute();
        var routeSegment = '/';

        if (isRoute(currentRoute)) {
          routeSegment = (currentRoute.segment === '' ? '/' : currentRoute.segment);
        }

        return (this.isRelative() ? this.parentRouter().path() : '') + routeSegment;
      }, router);

      this.$namespace.command.handler('setState', function(state) {
        var route = state;
        var params = state.params;

        if(_.isObject(state)) {
          route = state.name;
          params = params || {};
        }

        $router.setState(route, params);
      });
      this.$namespace.request.handler('currentRoute', function() { return $router.__private('currentRoute')(); });
      this.$namespace.request.handler('urlParts', function() { return $router.__private('urlParts')(); });
      this.$namespace.command.handler('activate', function() { $router.activate(); });

      var parentPathSubscription;
      var $previousParent = $nullRouter;
      subscriptions.push(router.parentRouter.subscribe(function ($parentRouter) {
        if (!isNullRouter($previousParent) && $previousParent !== $parentRouter) {
          $previousParent.router.childRouters.remove(this);

          if (parentPathSubscription) {
            subscriptions.remove(parentPathSubscription);
            parentPathSubscription.dispose();
          }
          subscriptions.push(parentPathSubscription = $parentRouter.path.subscribe(function triggerRouteRecompute() {
            $router.router.currentState.notifySubscribers();
          }));
        }
        $parentRouter.__private('childRouters').push(this);
        $previousParent = $parentRouter;
      }, this));

      // Automatically trigger the new Action() whenever the currentRoute() updates
      subscriptions.push(router.currentRoute.subscribe(function getActionForRouteAndTrigger(newRoute) {
        if(router.currentState().length) {
          getActionForRoute(newRoute)( /* get and call the action for the newRoute */ );
        }
      }, this));

      this.outlets = {};
      this.outlet = routerOutlet.bind(this);
      this.outlet.reset = function() {
        _.each( this.outlets, function(outlet) {
          outlet({ name: noComponentSelected, params: {} });
        });
      }.bind(this);

      if (!_.isUndefined(routerConfigParams.unknownRoute)) {
        if (_.isFunction(routerConfigParams.unknownRoute)) {
          routerConfigParams.unknownRoute = { controller: routerConfigParams.unknownRoute };
        }
        routerConfigParams.routes.push(extend(routerConfigParams.unknownRoute, { unknown: true }));
      }
      this.setRoutes(routerConfigParams.routes);

      if (routerConfigParams.activate === true) {
        subscriptions.push(router.context.subscribe(function activateRouterAfterNewContext( $context ) {
          if (_.isObject($context)) {
            this.activate($context);
          }
        }, this));
      }

      this.matchesRoute = function(routeName, path) {
        var route = getRouteForURL(path);
        routeName = [].concat(routeName);
        if (!_.isNull(route)) {
          return routeName.indexOf(route.name) !== -1;
        }
        return false;
      };
    },
    mixin: {
      setRoutes: function(routeDesc) {
        this.routeDescriptions = [];
        this.addRoutes(routeDesc);
        return this;
      },
      addRoutes: function(routeConfig) {
        this.routeDescriptions = this.routeDescriptions.concat( map(isArray(routeConfig) ? routeConfig : [routeConfig], transformRouteConfigToDesc) );
        return this;
      },
      activate: function($context, $parentRouter) {
        $context = $context || this.__private('context')();
        $parentRouter = $parentRouter || nearestParentRouter($context);

        if(!isNullRouter($parentRouter)) {
          this.__private('parentRouter')($parentRouter);
        } else if (_.isObject($context)) {
          $parentRouter = nearestParentRouter($context);
          if ($parentRouter !== this) {
            this.__private('parentRouter')($parentRouter);
          }
        }

        if (!this.__private('historyIsEnabled')()) {
          if (historyIsReady() && !this.__private('disableHistory')()) {
            History.Adapter.bind(windowObject, 'popstate', this.__private('stateChangeHandler', function (event) {
              var url = '';
              if (!fw.router.html5History() && windowObject.location.hash.length > 1) {
                url = windowObject.location.hash;
              } else {
                url = windowObject.location.pathname + windowObject.location.hash;
              }

              this.__private('currentState')( this.__private('normalizeURL')(url) );
            }.bind(this) ));
            this.__private('historyIsEnabled')(true);
          } else {
            this.__private('historyIsEnabled')(false);
          }
        }

        if (this.__private('currentState')() === '') {
          this.setState();
        }

        this.$namespace.trigger('activated', { context: $context, parentRouter: $parentRouter });
        return this;
      },
      setState: function(url, routeParams) {
        var namedRoute = _.isObject(routeParams) ? url : null;
        var configParams = this.__private('configParams');
        var continueToRoute = true;
        var useHistory = this.__private('historyIsEnabled')() && !this.__private('disableHistory')() && _.isFunction(History.getState);

        if(!_.isNull(namedRoute)) {
          // must convert namedRoute into its URL form
          var routeDescription = _.find(this.routeDescriptions, function (route) {
            return route.name === namedRoute;
          });

          if (!_.isUndefined(routeDescription)) {
            url = first([].concat(routeDescription.route));
            _.each(routeParams, function (value, fieldName) {
              url = url.replace(':' + fieldName, routeParams[fieldName]);
            });
          } else {
            throw new Error('Could not locate named route: ' + namedRoute);
          }
        }

        var isExternalURL = _.isString(url);
        if (!_.isString(url) && useHistory) {
          url = History.getState().url;
        }

        if (!isExternalURL) {
          url = this.__private('normalizeURL')(url);
        }

        if (_.isFunction(configParams.beforeRoute)) {
          continueToRoute = configParams.beforeRoute.call(this, url || '/');
        }

        if (continueToRoute) {
          if (useHistory) {
            if (isExternalURL) {
              var historyAPIWorked = true;
              try {
                historyAPIWorked = History.pushState(null, '', configParams.baseRoute + this.__private('parentRouter')().path() + url.replace(startingHashRegex, '/'));
              } catch (historyException) {
                historyAPIWorked = false;
              } finally {
                if (historyAPIWorked) {
                  return;
                }
              }
            } else {
              this.__private('currentState')(this.__private('normalizeURL')(url));
            }
          } else if (isExternalURL) {
            this.__private('currentState')(this.__private('normalizeURL')(url));
          } else {
            this.__private('currentState')('/');
          }

          if (!historyIsReady()) {
            var routePath = this.path();
            _.each(this.__private('childRouters')(), function (childRouter) {
              childRouter.__private('currentState')(routePath);
            });
          }
        }

        return this;
      },
      dispose: function() {
        if(!this._isDisposed) {
          this._isDisposed = true;

          var $parentRouter = this.__private('parentRouter')();
          if (!isNullRouter($parentRouter)) {
            $parentRouter.__private('childRouters').remove(this);
          }

          if (this.__private('historyIsEnabled')() && historyIsReady()) {
            History.Adapter.unbind(this.__private('stateChangeHandler'));
          }

          this.$namespace.dispose();
          this.$globalNamespace.dispose();
          invokeMap(this.__private('subscriptions'), 'dispose');

          _.each(omitBy(this, function (property) {
            return isEntity(property);
          }), propertyDispose);

          _.each(omitBy(this.__private(), function (property) {
            return isEntity(property);
          }), propertyDispose);

          if(configParams.onDispose !== _.noop) {
            configParams.onDispose.call(this, this.__private('element'));
          }

          return this;
        }
      }
    }
  };
};

fw.router = {
  baseRoute: fw.observable(''),
  activeRouteClassName: fw.observable('active'),
  disableHistory: fw.observable(false).broadcastAs({ name: 'disableHistory', namespace: fw.namespace() }),
  html5History: function() {
    var hasHTML5History = !!window.history && !!window.history.pushState;
    if(!_.isUndefined(window.History) && _.isObject(window.History.options) && window.History.options.html4Mode) {
      // user is overriding to force html4mode hash-based history
      hasHTML5History = false;
    }
    return hasHTML5History;
  },
  getNearestParent: function($context) {
    var $parentRouter = nearestParentRouter($context);
    return (!isNullRouter($parentRouter) ? $parentRouter : null);
  }
};

var descriptor;
entityDescriptors.push(descriptor = entityTools.prepareDescriptor({
  tagName: 'router',
  methodName: 'router',
  resource: fw.router,
  behavior: [ ViewModel, Router ],
  defaultConfig: {
    namespace: '$router',
    autoRegister: false,
    autoIncrement: false,
    showDuringLoad: noComponentSelected,
    extend: {},
    mixins: undefined,
    afterRender: _.noop,
    afterResolving: function resolveEntityImmediately(resolveNow) {
      resolveNow(true);
    },
    sequenceAnimations: false,
    onDispose: _.noop,
    baseRoute: null,
    isRelative: true,
    activate: true,
    beforeRoute: null,
    minTransitionPeriod: 0
  }
}));

fw.router.create = entityTools.entityClassFactory.bind(null, descriptor);