// framework/entities/router/outlet.js
// ------------------

var noParentViewModelError = { $namespace: { getName: function() { return 'NO-VIEWMODEL-IN-CONTEXT'; } } };

// This custom binding binds the outlet element to the $outlet on the router, changes on its 'route' (component definition observable) will be applied
// to the UI and load in various views
fw.virtualElements.allowedBindings.$bind = true;
fw.bindingHandlers.$bind = {
  init: function(element, valueAccessor, allBindings, outletViewModel, bindingContext) {
    var $parentViewModel = ( isObject(bindingContext) ? (bindingContext.$parent || noParentViewModelError) : noParentViewModelError);
    var $parentRouter = nearestParentRouter(bindingContext);
    var outletName = outletViewModel.outletName;

    if(isRouter($parentRouter)) {
      // register this outlet with the router so that updates will propagate correctly
      // take the observable returned and define it on the outletViewModel so that outlet route changes are reflected in the view
      outletViewModel.$route = $parentRouter.$outlet(outletName);
    } else {
      throw new Error('Outlet [' + outletName + '] defined inside of viewModel [' + $parentViewModel.$namespace.getName() + '] but no router was defined.');
    }
  }
};

function $routerOutlet(outletName, componentToDisplay, options) {
  options = options || {};
  if(isFunction(options)) {
    options = { onComplete: options, onFailure: noop };
  }

  var wasCompleted = false;
  var viewModelParameters = options.params;
  var onComplete = options.onComplete || noop;
  var onFailure = options.onFailure || noop;
  var router = this;
  var outlets = router.outlets;

  outletName = fw.unwrap(outletName);
  if(!isObservable(outlets[outletName])) {
    outlets[outletName] = fw.observable({
      name: noComponentSelected,
      params: {},
      __getOnCompleteCallback: function() { return noop; },
      __onFailure: onFailure.bind(router)
    }).broadcastAs({ name: outletName, namespace: router.$namespace });
  }

  var outlet = outlets[outletName];
  var currentOutletDef = outlet();
  var valueHasMutated = false;
  var isInitialLoad = outlet().name === noComponentSelected;

  if(!isUndefined(componentToDisplay)) {
    if(currentOutletDef.name !== componentToDisplay) {
      currentOutletDef.name = componentToDisplay;
      valueHasMutated = true;
    }

    if(!isUndefined(viewModelParameters)) {
      currentOutletDef.params = viewModelParameters;
      valueHasMutated = true;
    }
  }

  if(valueHasMutated) {
    // Return the onComplete callback once the DOM is injected in the page.
    // For some reason, on initial outlet binding only calls update once. Subsequent
    // changes get called twice (correct per docs, once upon initial binding, and once
    // upon injection into the DOM). Perhaps due to usage of virtual DOM for the component?
    var showDuringLoad = {
      name: result(this.__private('configParams'), 'showDuringLoad'),
      __getOnCompleteCallback: function(element) {
        if(element.children.length) {
          element.children[0].___isLoadingComponent = true;
        }
        return noop;
      }
    };

    currentOutletDef.__getOnCompleteCallback = function(element) {
      var isComplete = element.children.length && isUndefined(element.children[0].___isLoadingComponent);

      if(!wasCompleted && isComplete) {
        wasCompleted = true;
        activeOutlets.remove(outlet);
        return function addBindingOnComplete() {
          setTimeout(function() {
            if(element.className.indexOf(bindingClassName) === -1) {
              element.className += ' ' + bindingClassName;
            }
          }, animationIteration);

          onComplete.call(router, element);
        };
      } else {
        element.className = element.className.replace(' ' + bindingClassName, '');
        return noop;
      }
    };

    if(activeOutlets().indexOf(outlet) === -1) {
      activeOutlets.push(outlet);
    }

    if(showDuringLoad.name) {
      outlet(showDuringLoad);

      fw.components.get(currentOutletDef.name, function() {
        // now that its cached and loaded, lets show the desired component
        outlet(currentOutletDef);
      });
    } else {
      outlet.valueHasMutated();
    }
  }

  return outlet;
};

function registerOutletComponent() {
  internalComponents.push('outlet');
  fw.components.register('outlet', {
    autoIncrement: true,
    viewModel: function(params) {
      this.outletName = fw.unwrap(params.name);
      this.__isOutlet = true;
    },
    template: '<!-- ko $bind, component: $route --><!-- /ko -->'
  });

  internalComponents.push(noComponentSelected);
  fw.components.register(noComponentSelected, {
    viewModel: { instance: {} },
    template: '<div class="no-component-selected"></div>'
  });
};

runPostInit.push(registerOutletComponent);
