'use strict';

var sandbox = document.getElementById('sandbox');

describe('router', function () {
  it('has the ability to create a router', function() {
    var routerInitialized = false;

    expect(fw.router).to.be.a('function');

    var routerConstructor = fw.router({
      initialize: function() {
        routerInitialized = true;
      }
    });

    expect(routerConstructor).to.be.a('function');
    expect(new routerConstructor()).to.be.an('object');
  });

  it('has the ability to create a router with a correctly defined namespace whos name we can retrieve', function() {
    var Router = fw.router({
      namespace: 'RouterNamespaceCheck'
    });
    var router = new Router();

    expect(router.$router.$namespace).to.be.an('object');
    expect(router.$router.$namespace.getName()).to.be('RouterNamespaceCheck');
  });

  it('can register a router', function() {
    expect( fw.routers.isRegistered('registeredRouterCheck') ).to.be(false);

    fw.routers.register('registeredRouterCheck', function() {});

    expect( fw.routers.isRegistered('registeredRouterCheck') ).to.be(true);
  });

  it('can get a registered router', function() {
    expect( fw.routers.isRegistered('registeredRouterRetrieval') ).to.be(false);

    var RegisteredRouterRetrieval = function() {};

    fw.routers.register('registeredRouterRetrieval', RegisteredRouterRetrieval);

    expect( fw.routers.isRegistered('registeredRouterRetrieval') ).to.be(true);
    expect( fw.routers.getRegistered('registeredRouterRetrieval') ).to.be(RegisteredRouterRetrieval);
  });

  it('can autoRegister a router', function() {
    expect( fw.routers.isRegistered('autoRegisteredRouter') ).to.be(false);

    var autoRegisteredRouter = fw.router({
      namespace: 'autoRegisteredRouter',
      autoRegister: true
    });

    expect( fw.routers.isRegistered('autoRegisteredRouter') ).to.be(true);
    expect( fw.routers.getRegistered('autoRegisteredRouter') ).to.be(autoRegisteredRouter);
  });

  it('can get all instantiated routers', function() {
    var RouterA = fw.router({ namespace: 'RouterA' });
    var RouterB = fw.router({ namespace: 'RouterB' });

    var routers = [ new RouterA(), new RouterB() ];
    var routerList = _.keys( fw.routers.getAll() );

    expect( routerList ).to.contain('RouterA');
    expect( routerList ).to.contain('RouterB');
  });

  it('can get all instantiated routers of a specific namespace', function() {
    var routers = [];
    var Router = fw.router({ namespace: 'getAllSpecificRouter' });
    var numToMake = _.random(1,15);

    for(var x = numToMake; x; x--) {
      routers.push( new Router() );
    }

    expect( fw.routers.getAll('getAllSpecificRouter').filter(function(instance) {
      return instance.$namespace.getName() === 'getAllSpecificRouter';
    }).length ).to.be(numToMake);
  });

  it('can be instantiated with a list of routes', function() {
    var routesList = [ '/', '/route1', '/route2' ];

    var Router = fw.router({
      namespace: 'instantiatedListOfRoutes',
      routes: _.map(routesList, function(routePath) {
        return { route: routePath };
      })
    });

    var router = new Router();

    expect( _.reduce(router.$router.getRouteDescriptions(), function(routeDescriptions, routeDesc) {
      if( routesList.indexOf(routeDesc.route) !== -1 ) {
        routeDescriptions.push(routeDesc);
      }
      return routeDescriptions;
    }, []).length ).to.be( routesList.length );
  });

  it('can be instantiated declaratively from an autoRegistered router', function(done) {
    var container = document.getElementById('declarativeRouterInstantiation');
    var wasInitialized = false;

    fw.router({
      namespace: 'declarativeRouterInstantiation',
      autoRegister: true,
      initialize: function() {
        wasInitialized = true;
      }
    });

    expect(wasInitialized).to.be(false);

    fw.start(container);

    setTimeout(function() {
      expect(wasInitialized).to.be(true);
      done();
    }, 40);
  });

  it('can be nested and initialized declaratively', function(done) {
    var container = document.getElementById('declarativeNestedRouterInstantiation');
    var outerWasInitialized = false;
    var innerWasInitialized = false;

    fw.router({
      namespace: 'declarativeNestedRouterInstantiationOuter',
      autoRegister: true,
      initialize: function() {
        outerWasInitialized = true;
      }
    });

    fw.router({
      namespace: 'declarativeNestedRouterInstantiationInner',
      autoRegister: true,
      initialize: function() {
        innerWasInitialized = true;
      }
    });

    expect(outerWasInitialized).to.be(false);
    expect(innerWasInitialized).to.be(false);

    fw.start(container);

    setTimeout(function() {
      expect(outerWasInitialized).to.be(true);
      expect(innerWasInitialized).to.be(true);
      done();
    }, 40);
  });

  it('can trigger the default route', function(done) {
    var container = document.getElementById('defaultRouteCheck');
    var defaultRouteRan = false;

    fw.router({
      namespace: 'defaultRouteCheck',
      autoRegister: true,
      routes: [
        {
          route: '/',
          controller: function() {
            defaultRouteRan = true;
          }
        }
      ]
    });

    expect(defaultRouteRan).to.be(false);

    fw.start(container);

    setTimeout(function() {
      expect(defaultRouteRan).to.be(true);
      done();
    }, 40);
  });

  it('can trigger the unknownRoute', function(done) {
    var container = document.getElementById('unknownRouteCheck');
    var unknownRan = false;
    var router;

    fw.router({
      namespace: 'unknownRouteCheck',
      autoRegister: true,
      initialize: function() {
        router = this;
      },
      unknownRoute: {
        controller: function() {
          unknownRan = true;
        }
      }
    });

    expect(unknownRan).to.be(false);

    fw.start(container);

    setTimeout(function() {
      router.setState('/unknownRouteCheck');
      expect(unknownRan).to.be(true);
      done();
    }, 40);
  });

  it('can trigger a specified route', function(done) {
    var container = document.getElementById('specifiedRouteCheck');
    var specifiedRouteRan = false;
    var router;

    fw.router({
      namespace: 'specifiedRouteCheck',
      autoRegister: true,
      initialize: function() {
        router = this;
      },
      routes: [
        {
          route: '/specifiedRoute',
          controller: function() {
            specifiedRouteRan = true;
          }
        }
      ]
    });

    expect(specifiedRouteRan).to.be(false);

    fw.start(container);

    setTimeout(function() {
      router.setState('/specifiedRoute');
      expect(specifiedRouteRan).to.be(true);
      done();
    }, 40);
  });

  it('can trigger a specified route with a required parameter', function(done) {
    var container = document.getElementById('specifiedRouteWithReqParamCheck');
    var specifiedRouteRan = false;
    var testParam = 'luggageCode12345';
    var router;

    fw.router({
      namespace: 'specifiedRouteWithReqParamCheck',
      autoRegister: true,
      initialize: function() {
        router = this;
      },
      routes: [
        {
          route: '/specifiedRoute/:testParam',
          controller: function(params) {
            expect(params.testParam).to.be(testParam);
            specifiedRouteRan = true;
          }
        }
      ]
    });

    expect(specifiedRouteRan).to.be(false);

    fw.start(container);

    setTimeout(function() {
      router.setState('/specifiedRoute/' + testParam);
      expect(specifiedRouteRan).to.be(true);
      done();
    }, 40);
  });

  it('can trigger a specified route with an optional parameter with and without the parameter', function(done) {
    var container = document.getElementById('specifiedRouteWithOptParamCheck');
    var optParamNotSupplied = false;
    var optParamSupplied = false;
    var testParam = 'luggageCode12345';
    var router;

    fw.router({
      namespace: 'specifiedRouteWithOptParamCheck',
      autoRegister: true,
      initialize: function() {
        router = this;
      },
      routes: [
        {
          route: '/specifiedRoute/optParamNotSupplied(/:testParam)',
          controller: function(params) {
            expect(params.testParam).to.be(undefined);
            optParamNotSupplied = true;
          }
        }, {
          route: '/specifiedRoute/optParamSupplied(/:testParam)',
          controller: function(params) {
            expect(params.testParam).to.be(testParam);
            optParamSupplied = true;
          }
        }
      ]
    });

    expect(optParamNotSupplied).to.be(false);
    expect(optParamSupplied).to.be(false);

    fw.start(container);

    setTimeout(function() {
      router.setState('/specifiedRoute/optParamNotSupplied');
      router.setState('/specifiedRoute/optParamSupplied/' + testParam);
      expect(optParamNotSupplied).to.be(true);
      expect(optParamSupplied).to.be(true);
      done();
    }, 40);
  });

  it('can manipulate an outlet', function(done) {
    var container = document.getElementById('manipulateOutlet');
    var controllerRan = false;
    var componentInstantiated = false;
    var router;

    fw.components.register('manipulateOutletComponent', {
      viewModel: function() {
        componentInstantiated = true;
      },
      template: '<div></div>'
    });

    fw.router({
      namespace: 'manipulateOutlet',
      autoRegister: true,
      initialize: function() {
        router = this;
      },
      routes: [
        {
          route: '/manipulateOutlet',
          controller: function() {
            controllerRan = true;
            this.$outlet('output', 'manipulateOutletComponent');
          }
        }
      ]
    });

    expect(controllerRan).to.be(false);
    expect(componentInstantiated).to.be(false);

    fw.start(container);

    setTimeout(function() {
      router.setState('/manipulateOutlet');
      expect(controllerRan).to.be(true);

      setTimeout(function() {
        expect(componentInstantiated).to.be(true);
        done();
      }, 40);
    }, 40);
  });

  it('can see all/multiple referenced outlets defined in its context', function(done) {
    var container = document.getElementById('outletRefCheck');
    var routerInstantiated = false;
    var router;

    fw.router({
      namespace: 'outletRefCheck',
      autoRegister: true,
      initialize: function() {
        routerInstantiated = true;
        router = this;
      }
    });

    expect(routerInstantiated).to.be(false);

    fw.start(container);

    setTimeout(function() {
      expect(routerInstantiated).to.be(true);
      expect(_.keys(router.outlets)).to.eql([ 'output1', 'output2', 'output3' ]);
      done();
    }, 40);
  });

  it('can have callback triggered after outlet component is resolved and composed', function(done) {
    var container = document.getElementById('outletCallback');
    var controllerRan = false;
    var componentInstantiated = false;
    var outletCallbackRan = false;
    var router;

    fw.components.register('outletCallbackComponent', {
      viewModel: function() {
        componentInstantiated = true;
      },
      template: '<div class="outletCallbackComponent"></div>'
    });

    fw.router({
      namespace: 'outletCallback',
      autoRegister: true,
      initialize: function() {
        router = this;
      },
      routes: [
        {
          route: '/outletCallback',
          controller: function() {
            controllerRan = true;
            this.$outlet('output', 'outletCallbackComponent', function(element) {
              expect(element.tagName.toLowerCase()).to.be('outlet');
              expect(element.children[0].className).to.be('outletCallbackComponent');
              outletCallbackRan = true;
            });
          }
        }
      ]
    });

    expect(controllerRan).to.be(false);
    expect(componentInstantiated).to.be(false);

    fw.start(container);

    setTimeout(function() {
      router.setState('/outletCallback');
      expect(controllerRan).to.be(true);

      setTimeout(function() {
        expect(componentInstantiated).to.be(true);
        expect(outletCallbackRan).to.be(true);
        done();
      }, 40);
    }, 40);
  });

  it('can instantiate and properly render an outlet after its router has initialized', function(done) {
    var container = document.getElementById('outletAfterRouter');
    var controllerRan = false;
    var componentInstantiated = false;
    var outletCallbackRan = false;
    var router;
    var viewModel;

    fw.components.register('outletAfterRouter', {
      viewModel: function() {
        componentInstantiated = true;
      },
      template: '<div class="outletAfterRouter"></div>'
    });

    fw.viewModels.register('outletAfterRouter', fw.viewModel({
      initialize: function() {
        viewModel = this;
        this.outletVisible = fw.observable(false);
      }
    }));

    fw.router({
      namespace: 'outletAfterRouter',
      autoRegister: true,
      initialize: function() {
        router = this;
      },
      routes: [
        {
          route: '/outletAfterRouter',
          controller: function() {
            controllerRan = true;
            this.$outlet('output', 'outletAfterRouter', function(element) {
              expect(element.tagName.toLowerCase()).to.be('outlet');
              expect(element.children[0].className).to.be('outletAfterRouter');
              outletCallbackRan = true;
            });
          }
        }
      ]
    });

    expect(controllerRan).to.be(false);
    expect(componentInstantiated).to.be(false);
    expect(outletCallbackRan).to.be(false);

    fw.start(container);

    setTimeout(function() {
      router.setState('/outletAfterRouter');

      expect(controllerRan).to.be(true);
      expect(viewModel).to.be.an('object');

      viewModel.outletVisible(true);

      setTimeout(function() {
        expect(componentInstantiated).to.be(true);
        expect(outletCallbackRan).to.be(true);
        done();
      }, 40);
    }, 40);
  });

  it('can have nested/child routers path be dependent on its parents', function(done) {
    var container = document.getElementById('nestedRouteDependency');
    var outerRouterInstantiated = false;
    var innerRouterInstantiated = false;
    var subInnerRouterInstantiated = false;

    fw.router({
      namespace: 'outerNestedRouteDependency',
      autoRegister: true,
      routes: [
        { route: '/' },
        { route: '/outerRoute' }
      ],
      initialize: function() {
        outerRouterInstantiated = true;
      }
    });

    fw.router({
      namespace: 'innerNestedRouteDependency',
      autoRegister: true,
      routes: [
        { route: '/' },
        { route: '/innerRoute' }
      ],
      initialize: function() {
        innerRouterInstantiated = true;
      }
    });

    fw.router({
      namespace: 'subInnerNestedRouteDependency',
      autoRegister: true,
      initialize: function() {
        subInnerRouterInstantiated = true;
      }
    });

    function router(name) {
      return fw.routers.getAll(name)[0];
    }

    expect(outerRouterInstantiated).to.be(false);
    expect(innerRouterInstantiated).to.be(false);
    expect(subInnerRouterInstantiated).to.be(false);

    fw.start(container);

    setTimeout(function() {
      expect(outerRouterInstantiated).to.be(true);
      expect(innerRouterInstantiated).to.be(true);
      expect(subInnerRouterInstantiated).to.be(true);

      var outer = router('outerNestedRouteDependency');
      var inner = router('innerNestedRouteDependency');
      var subInner = router('subInnerNestedRouteDependency');

      expect(outer.path()).to.be('/');
      expect(inner.path()).to.be('//');
      expect(subInner.path()).to.be('///');

      outer.setState('/outerRoute');

      expect(outer.path()).to.be('/outerRoute');
      expect(inner.path()).to.be('/outerRoute/');
      expect(subInner.path()).to.be('/outerRoute//');

      inner.setState('/innerRoute');

      expect(outer.path()).to.be('/outerRoute');
      expect(inner.path()).to.be('/outerRoute/innerRoute');
      expect(subInner.path()).to.be('/outerRoute/innerRoute/');

      done();
    }, 40);
  });

  it('can have a nested/child router which is not relative to its parent', function(done) {
    var container = document.getElementById('nestedRouteNonRelative');
    var outerRouterInstantiated = false;
    var innerRouterInstantiated = false;

    fw.router({
      namespace: 'outerNestedRouteNonRelative',
      autoRegister: true,
      routes: [
        { route: '/' },
        { route: '/outerRoute' }
      ],
      initialize: function() {
        outerRouterInstantiated = true;
      }
    });

    fw.router({
      namespace: 'innerNestedRouteNonRelative',
      autoRegister: true,
      isRelative: false,
      routes: [
        { route: '/' },
        { route: '/outerRoute' }
      ],
      initialize: function() {
        innerRouterInstantiated = true;
      }
    });

    function router(name) {
      return fw.routers.getAll(name)[0];
    }

    expect(outerRouterInstantiated).to.be(false);
    expect(innerRouterInstantiated).to.be(false);

    fw.start(container);

    setTimeout(function() {
      expect(outerRouterInstantiated).to.be(true);
      expect(innerRouterInstantiated).to.be(true);

      var outer = router('outerNestedRouteNonRelative');
      var inner = router('innerNestedRouteNonRelative');

      expect(outer.path()).to.be('/');
      expect(inner.path()).to.be('/');

      outer.setState('/outerRoute');

      expect(outer.path()).to.be('/outerRoute');
      expect(inner.path()).to.be('/outerRoute');

      done();
    }, 40);
  });

  it('can have a registered location set and retrieved proplerly', function() {
    fw.routers.registerLocation('registeredLocationRetrieval', '/bogus/path');
    expect(fw.routers.getLocation('registeredLocationRetrieval')).to.be('/bogus/path');
  });

  it('can have a registered location with filename set and retrieved proplerly', function() {
    fw.routers.registerLocation('registeredLocationWithFilenameRetrieval', '/bogus/path/__file__.js');
    expect(fw.routers.getLocation('registeredLocationWithFilenameRetrieval')).to.be('/bogus/path/__file__.js');
  });

  it('can have a specific file extension set and used correctly', function() {
    fw.routers.fileExtensions('.jscript');
    fw.routers.registerLocation('registeredLocationWithExtensionRetrieval', '/bogus/path/');

    expect(fw.routers.getFileName('registeredLocationWithExtensionRetrieval')).to.be('registeredLocationWithExtensionRetrieval.jscript');

    fw.routers.fileExtensions('.js');
  });

  it('can have a callback specified as the extension with it invoked and the return value used', function() {
    fw.routers.fileExtensions(function(moduleName) {
      expect(moduleName).to.be('registeredLocationWithFunctionExtensionRetrieval');
      return '.jscriptFunction';
    });
    fw.routers.registerLocation('registeredLocationWithFunctionExtensionRetrieval', '/bogus/path/');

    expect(fw.routers.getFileName('registeredLocationWithFunctionExtensionRetrieval')).to.be('registeredLocationWithFunctionExtensionRetrieval.jscriptFunction');

    fw.routers.fileExtensions('.js');
  });

  it.skip('can load via requirejs with a declarative initialization from an already registered module', function(done) {
    /**
     * This test should work but requirejs currently doesn't seem to specify modules correctly.
     * Current OPEN issue: https://github.com/jrburke/requirejs/issues/1305
     *
     * The following should work but does not:
     *
     * expect(require.specified('test')).to.be(false); // PASS
     *
     * define('test', [], function() {});
     *
     * expect(require.specified('test')).to.be(true); // FAIL
     *
     * It DOES work once your require() the module...but specified() is supposed to work without that.
     */

    var container = document.getElementById('AMDPreRegisteredRouter');
    var routerLoaded = false;

    define('AMDPreRegisteredRouter', ['fw'], function(fw) {
      return fw.router({
        initialization: function() {
          routerLoaded = true;
        }
      });
    });

    expect(routerLoaded).to.be(false);
    fw.start(container);

    setTimeout(function() {
      expect(routerLoaded).to.be(true);
      done();
    }, 40);
  });

  it('can load via requirejs with a declarative initialization from a specified location', function(done) {
    var container = document.getElementById('AMDRouter');
    window.AMDRouterWasLoaded = false;

    fw.routers.registerLocation('AMDRouter', 'scripts/testAssets/');

    expect(window.AMDRouterWasLoaded).to.be(false);
    fw.start(container);

    setTimeout(function() {
      expect(window.AMDRouterWasLoaded).to.be(true);
      done();
    }, 40);
  });

  it('can load via requirejs with a declarative initialization from a specified location with the full file name', function(done) {
    var container = document.getElementById('AMDRouterFullName');
    window.AMDRouterFullNameWasLoaded = false;

    fw.routers.registerLocation('AMDRouterFullName', 'scripts/testAssets/AMDRouterFullName.js');

    expect(window.AMDRouterFullNameWasLoaded).to.be(false);
    fw.start(container);

    setTimeout(function() {
      expect(window.AMDRouterFullNameWasLoaded).to.be(true);
      done();
    }, 40);
  });

  it('can specify and load via requirejs with the default location', function(done) {
    var container = document.getElementById('defaultRouterLocation');
    window.defaultRouterLocationLoaded = false;

    fw.routers.defaultLocation('scripts/testAssets/defaultRouterLocation/');

    expect(window.defaultRouterLocationLoaded).to.be(false);

    fw.start(container);

    setTimeout(function() {
      expect(window.defaultRouterLocationLoaded).to.be(true);
      done();
    }, 40);
  });
});