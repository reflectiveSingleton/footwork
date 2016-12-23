var _ = require('footwork-lodash');
var fw = require('knockout/build/output/knockout-latest');

var isEntity = require('../entity-tools').isEntity;
var changeRoute = require('./router-tools').changeRoute;

var util = require('../../misc/util');
var resultBound = util.resultBound;
var propertyDispose = util.propertyDispose;
var privateDataSymbol = util.getSymbol('footwork');

var viewModelMethodDispose = require('../viewModel/viewModel-methods').dispose;
var clearSequenceQueue = require('../../binding/animation-sequencing').clearSequenceQueue;
var noComponentSelected = require('./router-config').noComponentSelected;

var activeOutlets = fw.observableArray();

module.exports = {
  outlet: function (outletName, options) {
    if(!_.isObject(options)) {
      options = { display: arguments.length > 1 ? options || noComponentSelected : undefined };
    }

    var router = this;
    var outlets = router[privateDataSymbol].outlets;
    var outletProperties = outlets[outletName] || {};
    var outlet = outletProperties.routeObservable;
    var outletViewModel = outletProperties.outletViewModel;
    var routerOutletOptions = resultBound(router[privateDataSymbol].configParams, 'outlet', router, [outletName, options]) || {};

    if (!fw.isObservable(outlet)) {
      // router outlet observable not found, we must create a new one
      outlet = fw.observable({
        name: noComponentSelected,
        params: {},
        getOnCompleteCallback: function () { return _.noop; },
        loading: options.loading || routerOutletOptions.loading
      });

      // register the new outlet under its outletName
      outlets[outletName] = {
        outletViewModel: outletProperties.outletViewModel || null,
        routeObservable: outlet
      };
    }

    // grab and set the loading display if needed
    var loadingDisplay = arguments.length > 1 ? (options.loading || routerOutletOptions.loading) : outlet().loading;
    if (outletViewModel && loadingDisplay) {
      outletViewModel.loading(loadingDisplay);
      delete routerOutletOptions.loading;
    }

    var outletHasMutated = false;
    if (!_.isUndefined(options.display)) {
      var currentOutletDef = outlet();

      if (currentOutletDef.name !== options.display) {
        currentOutletDef.name = options.display;
        outletHasMutated = true;
      }
      if (_.isObject(options.params)) {
        currentOutletDef.params = options.params;
        outletHasMutated = true;
      }

      if (outletHasMutated) {
        clearSequenceQueue();

        currentOutletDef.transition = options.transition || routerOutletOptions.transition || 0;
        if (outletViewModel) {
          outletViewModel[privateDataSymbol].loadingChildren.removeAll();
          outletViewModel.routeIsLoading(true);
        }

        currentOutletDef.getOnCompleteCallback = function (element) {
          var outletElement = element.parentNode;

          activeOutlets.remove(outlet);
          outletElement.setAttribute('data-rendered', (options.display === noComponentSelected ? '' : options.display));

          return function addBindingOnComplete () {
            var outletViewModel = outlets[outletName].outletViewModel;
            outletViewModel.routeIsLoading(false);
            outletViewModel.routeOnComplete = function () {
              (options.onComplete || routerOutletOptions.onComplete || _.noop).call(router, outletElement);
              router[privateDataSymbol].scrollToFragment();
            };
          };
        };

        if (activeOutlets().indexOf(outlet) === -1) {
          activeOutlets.push(outlet);
        }

        outlet.valueHasMutated();
      }
    }

    return outlet;
  },
  replaceState: function (route, routeParams) {
    changeRoute(this, 'replace', route, routeParams);
    return self;
  },
  pushState: function (route, routeParams) {
    changeRoute(this, 'push', route, routeParams);
    return self;
  },
  dispose: function () {
    if (!this[privateDataSymbol].isDisposed) {
      // first run all of the standard viewModel disposal logic
      viewModelMethodDispose.call(this);

      // deactivate the router (unbinds the history event listener)
      this.$activated(false);

      // dispose of all privately stored properties
      _.each(this[privateDataSymbol], propertyDispose);

      return this;
    }
  }
};


