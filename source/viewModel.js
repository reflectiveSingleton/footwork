// viewModel.js
// ------------------

// Duck type function for determining whether or not something is a footwork viewModel constructor function
function isViewModelCtor(thing) {
  return typeof thing !== 'undefined' && thing.__isViewModelCtor === true;
}

// Duck type function for determining whether or not something is a footwork viewModel
function isViewModel(thing) {
  return typeof thing !== 'undefined' && _.isFunction(thing.__getConfigParams) === true;
}

// Initialize the viewModels registry
var viewModels = {};

// Returns the number of created viewModels for each defined namespace
var viewModelCount = ko.viewModelCount = function() {
  var counts = _.reduce(namespaceNameCounter, function(viewModelCounts, viewModelCount, viewModelName) {
    viewModelCounts[viewModelName] = viewModelCount + 1;
    return viewModelCounts;
  }, {});
  counts.__total = _.reduce(_.values(counts), function(summation, num) {
    return summation + num;
  }, 0);
  return counts;
};

// Returns a reference to the specified viewModels.
// If no name is supplied, a reference to an array containing all model references is returned.
var getViewModels = ko.getViewModels = function(namespaceName) {
  if(namespaceName === undefined) {
    return viewModels;
  }
  return viewModels[namespaceName];
};

// Tell all viewModels to request the values which it listens for
var refreshModels = ko.refreshViewModels = function() {
  _.invoke(getViewModels(), 'refreshReceived');
};

var makeViewModel = ko.viewModel = function(configParams) {
  var ctor;
  var afterInit;

  configParams = configParams || {};
  if( typeof configParams !== 'undefined') {
    ctor = configParams.viewModel || configParams.initialize || noop;
    afterInit = configParams.afterInit || noop;
  }
  afterInit = { _postInit: afterInit };

  configParams = _.extend({
    namespace: undefined,
    componentNamespace: undefined,
    autoIncrement: false,
    mixins: undefined,
    params: undefined,
    afterBinding: noop,
    afterInit: noop,
    initialize: noop
  }, configParams);

  var initViewModelMixin = {
    _preInit: function( initParams ) {
      this.$params = configParams.params;
      this.__getConfigParams = function() {
        return configParams;
      };
      this.__getInitParams = function() {
        return initParams;
      };
    },
    _postInit: function() {
      this.$namespace.request.handler('__footwork_model_reference', function() {
        return this;
      });
    }
  };

  var composure = [ ctor, initViewModelMixin ].concat( viewModelMixins, afterInit );
  if(configParams.mixins !== undefined) {
    composure = composure.concat(configParams.mixins);
  }

  var model = riveter.compose.apply( undefined, composure );
  model.__isViewModelCtor = true;

  return model;
};