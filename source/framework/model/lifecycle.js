// framework/model/lifecycle.js
// ------------------

// Provides lifecycle functionality and $context for a given model and element
setupContextAndLifeCycle = function(viewModel, element) {
  if( isModel(viewModel) ) {
    var $configParams = viewModel.__getConfigParams();
    var context;
    element = element || document.body;
    viewModel.$element = element;
    viewModel.$context = elementContext = fw.contextFor(element.tagName.toLowerCase() === 'binding-wrapper' ? (element.parentElement || element.parentNode) : element);

    if( isFunction($configParams.afterBinding) ) {
      $configParams.afterBinding.call(viewModel, element);
    }

    if( isRouter(viewModel.$router) ) {
      viewModel.$router.context( elementContext );
    }

    if( !isUndefined(element) ) {
      fw.utils.domNodeDisposal.addDisposeCallback(element, function() {
        viewModel.dispose();
      });
    }
  }
}