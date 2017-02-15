var fw = require('knockout/build/output/knockout-latest');
var _ = require('footwork-lodash');

var entityDescriptors = require('../entity-descriptors');
var viewModelBootstrap = require('../viewModel/viewModel-bootstrap');

var privateDataSymbol = require('../../misc/util').getSymbol('footwork');
var noComponentSelected = require('../router/router-config').noComponentSelected;

var outletTools = require('./outlet-tools');
var visibleCSS = outletTools.visibleCSS;
var hiddenCSS = outletTools.hiddenCSS;
var addAnimation = outletTools.addAnimation;
var removeAnimation = outletTools.removeAnimation;

/**
 * Bootstrap an instance with outlet capabilities.
 *
 * @param {any} instance
 * @param {any} configParams
 * @returns {object} The instance that was passed in
 */
function outletBootstrap (instance, configParams) {
  var descriptor = entityDescriptors.getDescriptor('outlet');

  // bootstrap/mixin viewModel functionality
  viewModelBootstrap(instance, configParams, descriptor);

  var hasBeenBootstrapped = !_.isUndefined(instance[descriptor.isEntityDuckTag]);
  if (!hasBeenBootstrapped) {
    var privateData = instance[privateDataSymbol];
    instance[descriptor.isEntityDuckTag] = true; // mark as hasBeenBootstrapped

    _.extend(privateData, {
      addResolvedCallbackOrExecute: function (callback) {
        /* istanbul ignore else */
        if (instance.routeIsResolving()) {
          resolvedCallbacks.push(callback);
        } else {
          callback();
        }
      }
    });

    var resolvedCallbacks = [];
    _.extend(instance, {
      loading: fw.observable(noComponentSelected),
      routeIsLoading: fw.observable(true),
      routeIsResolving: fw.observable(true)
    });

    function showLoadedAfterMinimumTransition () {
      instance.loadingClass(removeAnimation());
      instance.loadedStyle(visibleCSS);
      instance.loadingStyle(hiddenCSS);
      instance.loadedClass(addAnimation());

      if (resolvedCallbacks.length) {
        _.each(resolvedCallbacks, function (callback) {
          callback();
        });
        resolvedCallbacks = [];
      }

      privateData.routeOnComplete();
    }

    var transitionTriggerTimeout;

    _.extend(instance, {
      loadingStyle: fw.observable(),
      loadedStyle: fw.observable(),
      loadingClass: fw.observable(),
      loadedClass: fw.observable(),
      showLoader: function showLoader () {
        var removeAnim = removeAnimation();

        instance.loadingClass(removeAnim);
        instance.loadedClass(removeAnim);
        instance.loadedStyle(hiddenCSS);
        instance.loadingStyle(visibleCSS);

        setTimeout(function () {
          instance.loadingClass(addAnimation());
        }, 0);
      },
      showLoaded: function showLoaded () {
        clearTimeout(transitionTriggerTimeout);
        var transition = instance.display.peek().transition;
        if (transition) {
          transitionTriggerTimeout = setTimeout(showLoadedAfterMinimumTransition, transition);
        } else {
          showLoadedAfterMinimumTransition();
        }
      }
    });

    instance.disposeWithInstance(
      instance.routeIsLoading.subscribe(function disposeWithInstanceCallback (routeIsLoading) {
        if (routeIsLoading) {
          instance.routeIsResolving(true);
        } else {
          /* istanbul ignore next */
          if (privateData.loadingChildrenWatch && _.isFunction(privateData.loadingChildrenWatch.dispose)) {
            privateData.loadingChildrenWatch.dispose();
          }

          // must allow binding to begin on any subcomponents/etc
          setTimeout(function () {
            if (privateData.loadingChildren().length) {
              /* istanbul ignore next */
              privateData.loadingChildrenWatch = privateData.loadingChildren.subscribe(function (loadingChildren) {
                if (!loadingChildren.length) {
                  instance.routeIsResolving(false);
                }
              });
            } else {
              instance.routeIsResolving(false);
            }
          }, 0);
        }
      }),
      instance.routeIsResolving.subscribe(function transitionTrigger (routeIsResolving) {
        if (routeIsResolving) {
          instance.showLoader();
        } else {
          instance.showLoaded();
        }
      })
    );
  }

  return instance;
}

module.exports = outletBootstrap;
