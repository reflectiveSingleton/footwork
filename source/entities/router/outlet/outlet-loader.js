var fw = require('knockout/build/output/knockout-latest');
var _ = require('lodash');

var util = require('../../../misc/util');
var isAmdResolved = util.isAmdResolved;
var isPath = util.isPath;

var routerDefaults = require('../router-defaults');
var outletLoadedDisplay = routerDefaults.outletLoadedDisplay;
var outletLoadingDisplay = routerDefaults.outletLoadingDisplay;

var entityClass = require('../../../misc/config').entityClass;
var bindingElement = require('../../../binding/binding-element');

function Outlet() {
  fw.outlet.boot(this);
}

/**
 * The outlet loader has two functions:
 * 1. provides the outlet viewModel constructor to bind against and control an outlets display
 * 2. provides the outlet template bound against the viewModel which is used to control display/output of its area via the component: display binding
 */
fw.components.loaders.unshift(fw.components.outletLoader = {
  getConfig: function (componentName, callback) {
    if (componentName === 'outlet') {
      callback({
        viewModel: Outlet,
        template: bindingElement.open.prefix + '$lifecycle, $outlet' + bindingElement.open.postfix +
          '<div class="' + outletLoadingDisplay + ' ' + entityClass + '" ' +
            'data-bind="style: loadingStyle, css: loadingClass, component: loadingDisplay"></div>' +
          '<div class="' + outletLoadedDisplay + ' ' + entityClass + '" ' +
            'data-bind="style: loadedStyle, css: loadedClass, component: display"></div>' +
        bindingElement.close
      });
    } else {
      callback(null);
    }
  }
});
