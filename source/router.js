// router.js
// ------------------

/**
 * Example route:
 * {
 *   route: 'test/route(/:optional)',
 *   title: function() {
 *     return ko.request('nameSpace', 'broadcast:someVariable');
 *   },
 *   nav: true
 * }
 */

// polyfill for missing window.location.origin
if( !isString(windowObject.location.origin) ) {
  windowObject.location.origin = windowObject.location.protocol + "//" + windowObject.location.hostname + (windowObject.location.port ? ':' + windowObject.location.port: '');
}

// Predicate function that always returns true / 'pass'
var alwaysPassPredicate = function() { return true; };

var emptyStringResult = function() { return ''; };

var routerDefaultConfig = {
  namespace: '$router',
  baseRoute: null,
  isRelative: true,
  activate: true,
  setHref: true,
  routes: []
};

// Regular expressions used to parse a uri
var optionalParam = /\((.*?)\)/g;
var namedParam = /(\(\?)?:\w+/g;
var splatParam = /\*\w*/g;
var escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;
var hashMatch = /(^\/#)/;
var routesAreCaseSensitive = true;

var invalidRoutePathIdentifier = '___invalid-route';

var $nullRouter = extend({}, $baseRouter, {
  childRouters: extend( bind(noop), { push: noop } ),
  routePath: function() { return ''; },
  isRelative: function() { return false; },
  __isNullRouter: true
});

var $baseRouter = {
  routePath: emptyStringResult,
  routeSegment: emptyStringResult,
  childRouters: ko.observableArray(),
  __isRouter: true
};

var baseRoute = {
  controller: noop,
  indexedParams: [],
  namedParams: {},
  __isRoute: true
};

var baseRouteDescription = {
  __isRouteDesc: true
};

// Convert a route string to a regular expression which is then used to match a uri against it and determine whether that uri matches the described route as well as parse and retrieve its tokens
function routeStringToRegExp(routeString, url) {
  routeString = routeString
    .replace(escapeRegExp, "\\$&")
    .replace(optionalParam, "(?:$1)?")
    .replace(namedParam, function(match, optional) {
      return optional ? match : "([^\/]+)";
    })
    .replace(splatParam, "(.*?)");

  return new RegExp('^' + routeString + (routeString !== '/' ? '(\\/.*)*' : '$'), routesAreCaseSensitive ? undefined : 'i');
}

function extractNavItems(routes) {
  routes = isArray(routes) ? routes : [routes];
  return where(routes, { nav: true });
}

function historyIsReady() {
  var isReady = has(History, 'Adapter');
  if(isReady && isUndefined(History.Adapter.unbind)) {
    // why .unbind() is not already present in History.js is beyond me
    History.Adapter.unbind = function(callback) {
      each(History.Adapter.handlers, function(handler) {
        handler.statechange = filter(handler.statechange, function(stateChangeHandler) {
          return stateChangeHandler !== callback;
        });
      });
    };
  }
  return isReady;
}

function hasNavItems(routes) {
  return extractNavItems( routes ).length > 0;
}

function isNullRouter(thing) {
  return isObject(thing) && !!thing.__isNullRouter;
}

function isRouter(thing) {
  return isObject(thing) && !!thing.__isRouter;
}

function isRoute(thing) {
  return isObject(thing) && !!thing.__isRoute;
}

// Recursive function which will locate the nearest $router from a given ko $context
// (travels up through $parentContext chain to find the router if not found on the
// immediate $context). Returns null if none is found.
function nearestParentRouter($context) {
  var $parentRouter = $nullRouter;
  if( isObject($context) ) {
    if( isObject($context.$data) && isRouter($context.$data.$router) ) {
      // found router in this context
      $parentRouter = $context.$data.$router;
    } else if( isObject($context.$parentContext) ) {
      // search through next parent up the chain
      $parentRouter = nearestParentRouter( $context.$parentContext );
    }
  }
  return $parentRouter;
}

var noComponentSelected = '_noComponentSelected';
var $routerOutlet = function(outletName, componentToDisplay, viewModelParameters ) {
  var outlets = this.outlets;

  outletName = ko.unwrap( outletName );
  if( !isObservable(outlets[outletName]) ) {
    outlets[outletName] = ko.observable({ name: noComponentSelected, params: {} });
  }

  var outlet = outlets[outletName];
  var currentOutletDef = outlet();
  var valueHasMutated = false;

  if( !isUndefined(componentToDisplay) ) {
    currentOutletDef.name = componentToDisplay;
    valueHasMutated = true;
  }

  if( !isUndefined(viewModelParameters) ) {
    currentOutletDef.params = viewModelParameters;
    valueHasMutated = true;
  }

  if( valueHasMutated ) {
    outlet.valueHasMutated();
  }

  return outlet;
};

ko.routers = {
  // Configuration point for a baseRoute / path which will always be stripped from the URL prior to processing the route
  baseRoute: ko.observable(''),
  
  // Return array of all currently instantiated $router's
  getAll: function() {
    return $globalNamespace.request('__router_reference');
  }
};

ko.router = function( routerConfig, $viewModel, $context ) {
  return new Router( routerConfig, $viewModel, $context );
};

ko.bindingHandlers.$route = {
  init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
    var $myRouter = nearestParentRouter(bindingContext);
    var $nearestParentRouter = nearestParentRouter( $myRouter.context().$parentContext );

    var setHref = !!$myRouter.config.setHref;
    var prependedRoutePath = ($myRouter.isRelative() && !isNullRouter($nearestParentRouter)) ? $nearestParentRouter.routePath() : '';
    var suppliedRoutePath = ko.unwrap(valueAccessor()) || '';
    var routePath = prependedRoutePath + (suppliedRoutePath || element.getAttribute('href'));

    var tagName = element.tagName;
    if( setHref && ((isString(tagName) && tagName.toLowerCase() === 'a') || element.hasAttribute('href')) ) {
      element.setAttribute('href', routePath);
    }

    ko.utils.registerEventHandler(element, 'click', function( event ) {
      History.pushState( null, document.title, element.getAttribute('href') || routePath );
      event.preventDefault();
    });
  }
};

var Router = function( routerConfig, $viewModel, $context ) {
  extend(this, $baseRouter);
  var subscriptions = this.subscriptions = [];
  var viewModelNamespaceName;

  if( isViewModel($viewModel) ) {
    viewModelNamespaceName = $viewModel.getNamespaceName();
  }

  this.id = uniqueId('router');
  this.$globalNamespace = makeNamespace();
  this.$namespace = makeNamespace( routerConfig.namespace || (viewModelNamespaceName + 'Router') );
  this.$namespace.enter();

  this.$viewModel = $viewModel;
  this.childRouters = ko.observableArray();
  this.parentRouter = ko.observable($nullRouter);
  this.context = ko.observable();
  this.historyIsEnabled = ko.observable(false).broadcastAs('historyIsEnabled');
  this.currentState = ko.observable().broadcastAs('currentState');
  this.config = routerConfig = extend({}, routerDefaultConfig, routerConfig);
  this.config.baseRoute = ko.routers.baseRoute() + (result(routerConfig, 'baseRoute') || '');

  this.isRelative = ko.computed(function() {
    return routerConfig.isRelative && !isNullRouter( this.parentRouter() );
  }, this);
  
  this.currentRoute = ko.computed(function() {
    return this.getRouteForURL( this.currentState() );
  }, this);
  
  this.routePath = ko.computed(function() {
    var currentRoute = this.currentRoute();
    var parentRouter = this.parentRouter();
    var routePath = this.parentRouter().routePath();

    if( isRoute(currentRoute) ) {
      routePath = routePath + currentRoute.routeSegment;
    }
    return routePath;
  }, this);

  var $previousParent = $nullRouter;
  subscriptions.push(this.parentRouter.subscribe(function( $parentRouter ) {
    if( !isNullRouter($previousParent) && $previousParent !== $parentRouter ) {
      $previousParent.childRouters.remove(this);
    }
    $parentRouter.childRouters.push(this);
    $previousParent = $parentRouter;
  }, this));

  // Automatically trigger the new Action() whenever the currentRoute() updates
  subscriptions.push( this.currentRoute.subscribe(function( newRoute ) {
    this.getActionForRoute( newRoute )( /* get and call the action for the newRoute */ );
  }, this) );

  var $router = this;
  this.$globalNamespace.request.handler('__router_reference', function() {
    return $router;
  });

  this.currentState('');

  this.navModelUpdate = ko.observable();
  this.outlets = {};
  this.$outlet = bind( $routerOutlet, this );
  this.$outlet.reset = bind( function() {
    each( this.outlets, function(outlet) {
      outlet({ name: noComponentSelected, params: {} });
    });
  }, this);

  this.setRoutes( routerConfig.routes );

  if( routerConfig.activate === true ) {
    subscriptions.push(this.context.subscribe(function( $context ) {
      if( isObject($context) ) {
        this.activate( $context );
      }
    }, this));
  }
  this.context( $viewModel.$context || $context );

  this.$namespace.exit();
};

Router.prototype.setRoutes = function(routeDesc) {
  this.routeDescriptions = [];
  this.addRoutes(routeDesc);
  return this;
};

Router.prototype.addRoutes = function(routeDesc) {
  routeDesc = isArray(routeDesc) ? routeDesc : [routeDesc];
  this.routeDescriptions = this.routeDescriptions.concat( map(routeDesc, function(routeDesc) {
    return extend( { id: uniqueId('route') }, baseRouteDescription, routeDesc );
  }) );

  if( hasNavItems(routeDesc) && isObservable(this.navigationModel) ) {
    this.navModelUpdate.notifySubscribers();
  }

  return this;
};

Router.prototype.activate = function($context, $parentRouter) {
  return this
    .startup( $context, $parentRouter )
    .stateChange();
};

Router.prototype.stateChange = function(url) {
  if( !isString(url) && this.historyIsEnabled() ) {
    url = History.getState().url;
  }

  if( isString(url) ) {
    this.currentState( this.normalizeURL(url) );
  }
};

Router.prototype.startup = function( $context, $parentRouter ) {
  var $myRouter = this;
  $parentRouter = $parentRouter || $nullRouter;

  if( !isNullRouter($parentRouter) ) {
    this.parentRouter( $parentRouter );
  } else if( isObject($context) ) {
    this.parentRouter( $parentRouter = nearestParentRouter($context) );
  }

  if( !this.historyIsEnabled() ) {
    if( historyIsReady() ) {
      History.Adapter.bind( windowObject, 'statechange', this.stateChangeHandler = function() {
        $myRouter.stateChange( History.getState().url );
      } );
      this.historyIsEnabled(true);
    } else {
      this.historyIsEnabled(false);
    }
  }

  return this;
};

Router.prototype.shutdown = function() {
  var $parentRouter = this.parentRouter();
  if( !isNullRouter($parentRouter) ) {
    $parentRouter.childRouters.remove(this);
  }

  if( this.historyIsEnabled() && historyIsReady() ) {
    History.Adapter.unbind( this.stateChangeHandler );
  }

  this.$namespace.shutdown();
  this.$globalNamespace.shutdown();

  invoke(this.subscriptions, 'dispose');
  each(this, function(property) {
    if( property && isFunction(property.dispose) ) {
      property.dispose();
    }
  });
};

Router.prototype.normalizeURL = function(url) {
  if( url.indexOf(windowObject.location.origin) === 0 ) {
    url = url.substr(windowObject.location.origin.length);
  }

  if( !isNull(this.config.baseRoute) && url.indexOf(this.config.baseRoute) === 0 ) {
    url = url.substr(this.config.baseRoute.length);
    if(url.length > 1) {
      url = url.replace(hashMatch, '/');
    }
  }
  return url;
};

Router.prototype.getUnknownRoute = function() {
  var unknownRoute = findWhere(this.getRouteDescriptions(), { unknown: true }) || null;

  if( !isNull(unknownRoute) ) {
    unknownRoute = extend({}, baseRoute, {
      id: unknownRoute.id,
      controller: unknownRoute.controller,
      title: unknownRoute.title,
      routeSegment: ''
    });
  }
  
  return unknownRoute;
};

Router.prototype.getRouteForURL = function(url) {
  var route = null;
  var parentRoutePath = this.parentRouter().routePath() || '';

  if( this.isRelative() ) {
    // since this is a relative router, we need to remove the leading parentRoutePath section of the URL
    if( parentRoutePath.length > 0 ) {
      if( ( routeIndex = url.indexOf(parentRoutePath) ) === 0 ) {
        url = url.substr( parentRoutePath.length );
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  find(this.getRouteDescriptions(), function(routeDesc, routeIndex) {
    var routeString = routeDesc.route;

    if( isString(routeString) ) {
      var splatSegment = '';
      var routeRegex = routeStringToRegExp(routeString, url);
      var routeParamValues = url.match(routeRegex);

      if( !isNull(routeParamValues) ) {
        if( true ) {
          splatSegment = routeParamValues.pop() || '';
        }

        var routeParamNames = map( routeString.match(namedParam), function(param) {
          return param.replace(':', '');
        } );

        route = extend({}, baseRoute, {
          id: routeDesc.id,
          controller: routeDesc.controller,
          title: routeDesc.title,
          url: url,
          routeSegment: url.substr(0, url.length - splatSegment.length),
          indexedParams: routeParamValues,
          namedParams: reduce(routeParamNames, function(parameterNames, parameterName, index) {
              parameterNames[parameterName] = routeParamValues[index + 1];
              return parameterNames;
            }, {})
        });
      }
    }

    return route;
  });

  if( isNull(route) ) {
    return this.getUnknownRoute();
  }

  return route;
};

Router.prototype.getActionForRoute = function(routeDescription) {
  var Action = bind( function() {
    delete this.__currentRouteDescription;
    this.$outlet.reset();
  }, this );

  if( isRoute(routeDescription) ) {
    Action = bind(function() {
      if( !isUndefined(routeDescription.title) ) {
        document.title = isFunction(routeDescription.title) ? routeDescription.title.call(this) : routeDescription.title;
      }

      if( isUndefined(this.__currentRouteDescription) || this.__currentRouteDescription.id !== routeDescription.id ) {
        routeDescription.controller.call( this.$viewModel, this.$outlet, routeDescription );
      }
      this.__currentRouteDescription = routeDescription;
    }, this);
  }

  return Action;
};

Router.prototype.getRouteDescriptions = function() {
  return this.routeDescriptions;
};

Router.prototype.navigationModel = function(predicate) {
  if( isUndefined(this.navigationModel) ) {
    this.navigationModel = ko.computed(function() {
      this.navModelUpdate(); // dummy reference used to trigger updates
      return filter( extractNavItems(this.routeDescriptions), (predicate || alwaysPassPredicate) );
    }, { navModelUpdate: this.navModelUpdate }).broadcastAs({ name: 'navigationModel', namespace: this.$namespace });
  }

  return this.navigationModel;
};