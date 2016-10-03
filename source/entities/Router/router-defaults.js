var _ = require('../../misc/lodash');
var util = require('../../misc/util');

var alwaysPassPredicate = util.alwaysPassPredicate;
var noComponentSelected = '_noComponentSelected';
var nullComponent = '_nullComponent';
var invalidRoutePathIdentifier = '___invalid-route';

var routesAreCaseSensitive = true;

var nullRouterData = {
  context: _.noop,
  childRouters: _.extend( _.noop.bind(), { push: _.noop } ),
  isRelative: function() { return false; }
};

var $nullRouter = {
  __private: function(propName) {
    if(arguments.length) {
      return nullRouterData[propName];
    }
    return nullRouterData;
  },
  path: function() { return ''; },
  __isNullRouter: true
};

var baseRoute = {
  controller: _.noop,
  indexedParams: [],
  namedParams: {},
  __isRoute: true
};

var baseRouteDescription = {
  filter: alwaysPassPredicate,
  __isRouteDesc: true
};

module.exports = {
  noComponentSelected: noComponentSelected,
  nullComponent: nullComponent,
  invalidRoutePathIdentifier: invalidRoutePathIdentifier,
  routesAreCaseSensitive: routesAreCaseSensitive,
  nullRouterData: nullRouterData,
  $nullRouter: $nullRouter,
  baseRoute: baseRoute,
  baseRouteDescription: baseRouteDescription
};
