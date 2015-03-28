'use strict';

var sandbox = document.getElementById('sandbox');

describe('dataModel', function () {
  it('has the ability to create a dataModel', function() {
    expect(fw.dataModel).to.be.a('function');
    expect(fw.dataModel()).to.be.a('function');
  });

  it('has the ability to create a dataModel with a correctly defined namespace whos name we can retrieve', function() {
    var ModelA = fw.dataModel({
      namespace: 'ModelA'
    });
    var modelA = new ModelA();

    expect(modelA.$namespace).to.be.an('object');
    expect(modelA.getNamespaceName()).to.eql('ModelA');
  });

  it('correctly names and increments counter for indexed dataModels', function() {
    var IndexedDataModel = fw.dataModel({
      namespace: 'IndexedDataModel',
      autoIncrement: true
    });

    var firstDataModel = new IndexedDataModel();
    var secondDataModel = new IndexedDataModel();
    var thirdDataModel = new IndexedDataModel();

    expect(firstDataModel.getNamespaceName()).to.eql('IndexedDataModel0');
    expect(secondDataModel.getNamespaceName()).to.eql('IndexedDataModel1');
    expect(thirdDataModel.getNamespaceName()).to.eql('IndexedDataModel2');
  });

  it('correctly applies a mixin to a dataModel', function() {
    var DataModelWithMixin = fw.dataModel({
      namespace: 'DataModelWithMixin',
      mixins: [
        {
          _preInit: function() {
            this.preInitRan = true;
          },
          mixin: {
            mixinPresent: true
          },
          _postInit: function() {
            this.postInitRan = true;
          }
        }
      ]
    });

    var dataModel = new DataModelWithMixin();

    expect(dataModel.preInitRan).to.be(true);
    expect(dataModel.mixinPresent).to.be(true);
    expect(dataModel.postInitRan).to.be(true);
  });

  it('has the ability to create nested dataModels with correctly defined namespaces', function() {
    var ModelA = fw.dataModel({
      namespace: 'ModelA',
      initialize: function() {
        this.preSubModelNamespaceName = fw.utils.currentNamespaceName();
        this.subModelB = new ModelB();
        this.postSubModelNamespaceName = fw.utils.currentNamespaceName();
      }
    });

    var ModelB = fw.dataModel({
      namespace: 'ModelB',
      initialize: function() {
        this.preSubModelNamespaceName = fw.utils.currentNamespaceName();
        this.subModelC = new ModelC();
        this.postSubModelNamespaceName = fw.utils.currentNamespaceName();
      }
    });

    var ModelC = fw.dataModel({
      namespace: 'ModelC',
      initialize: function() {
        this.recordedNamespaceName = fw.utils.currentNamespaceName();
      }
    });

    var modelA = new ModelA();
    expect(modelA.preSubModelNamespaceName).to.eql('ModelA');
    expect(modelA.postSubModelNamespaceName).to.eql('ModelA');
    expect(modelA.subModelB.preSubModelNamespaceName).to.eql('ModelB');
    expect(modelA.subModelB.postSubModelNamespaceName).to.eql('ModelB');
    expect(modelA.subModelB.subModelC.recordedNamespaceName).to.eql('ModelC');
  });

  it('calls afterInit after initialize when creating a new instance', function() {
    var initializeWasCalledFirst = false;
    var afterInitWasCalledSecond = false;

    var ModelA = fw.dataModel({
      namespace: 'ModelA',
      initialize: function() {
        if(!afterInitWasCalledSecond) {
          initializeWasCalledFirst = true;
        }
      },
      afterInit: function() {
        if(initializeWasCalledFirst) {
          afterInitWasCalledSecond = true;
        }
      }
    });
    var modelA = new ModelA();

    expect(afterInitWasCalledSecond).to.be(true);
  });

  it('calls afterBinding after initialize with the correct target element when creating and binding a new instance', function() {
    var initializeWasCalledFirst = false;
    var afterBindingWasCalledSecond = false;
    var containerIsTheSame = false;
    var container = document.getElementById('afterBindingDataModel');

    var ModelA = fw.dataModel({
      namespace: 'ModelA',
      initialize: function() {
        if(!afterBindingWasCalledSecond) {
          initializeWasCalledFirst = true;
        }
      },
      afterBinding: function(containingElement) {
        if(initializeWasCalledFirst) {
          afterBindingWasCalledSecond = true;
        }
        if(containingElement === container) {
          containerIsTheSame = true;
        }
      }
    });

    var modelA = new ModelA();
    fw.applyBindings(modelA, container);

    expect(afterBindingWasCalledSecond).to.be(true);
    expect(containerIsTheSame).to.be(true);
  });

  it('after binding has the correct containing $element referenced', function(done) {
    var hasElementReference = false;
    var checkForReference;
    var modelA;
    var container = document.getElementById('afterBindingDataModelElementReference');

    var ModelA = fw.dataModel({
      namespace: 'ModelA',
      afterBinding: function(containingElement) {
        checkForReference();
      }
    });

    checkForReference = function() {
      if( _.isObject(modelA.$element) ) {
        hasElementReference = true;
      }

      expect(modelA.$element).to.be.an('object');
      expect(modelA.$element).to.be(container);
      done();
    };

    modelA = new ModelA();

    expect(hasElementReference).to.be(false);

    fw.applyBindings(modelA, container);
  });

  it('can register a dataModel', function() {
    expect( fw.components.isRegistered('registeredDataModelCheck') ).to.be(false);

    fw.dataModels.register('registeredDataModelCheck', function() {});

    expect( fw.dataModels.isRegistered('registeredDataModelCheck') ).to.be(true);
  });

  it('can get a registered dataModel', function() {
    expect( fw.components.isRegistered('registeredDataModelRetrieval') ).to.be(false);

    var RegisteredDataModelRetrieval = function() {};

    fw.dataModels.register('registeredDataModelRetrieval', RegisteredDataModelRetrieval);

    expect( fw.dataModels.isRegistered('registeredDataModelRetrieval') ).to.be(true);
    expect( fw.dataModels.getRegistered('registeredDataModelRetrieval') ).to.be(RegisteredDataModelRetrieval);
  });

  it('can get all instantiated dataModels', function() {
    var DataModel = fw.dataModel();
    var dataModels = [ new DataModel(), new DataModel() ];

    expect( _.keys(fw.dataModels.getAll()).length ).to.be.greaterThan(0);
  });

  it('can get all instantiated dataModels of a specific type/name', function() {
    var dataModels = [];
    var DataModel = fw.dataModel({ namespace: 'getAllSpecificDataModel' });
    var numToMake = _.random(1,15);

    for(var x = numToMake; x; x--) {
      dataModels.push( new DataModel() );
    }

    expect( fw.dataModels.getAll('getAllSpecificDataModel').length ).to.be(numToMake);
  });

  it('can autoRegister a dataModel during class method creation', function() {
    var isRegistered = fw.dataModels.isRegistered('autoRegisteredDataModel');

    expect(isRegistered).to.be(false);

    fw.dataModel({
      namespace: 'autoRegisteredDataModel',
      autoRegister: true
    });

    isRegistered = fw.dataModels.isRegistered('autoRegisteredDataModel');

    expect(isRegistered).to.be(true);
  });

  it('can bind to the DOM using a <dataModel> declaration', function(done) {
    var wasInitialized = false;
    var container = document.getElementById('declarativeDataModel');

    fw.dataModel({
      namespace: 'declarativeDataModel',
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
    }, 0);
  });

  it('can nest <dataModel> declarations', function(done) {
    var container = document.getElementById('nestedDataModels');
    var outerWasInitialized = false;
    var innerWasInitialized = false;

    fw.dataModel({
      namespace: 'nestedDataModelOuter',
      autoRegister: true,
      initialize: function() {
        outerWasInitialized = true;
      }
    });

    fw.dataModel({
      namespace: 'nestedDataModelInner',
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
    }, 0);
  });

  it('can pass parameters through a <dataModel> declaration', function(done) {
    var wasInitialized = false;
    var container = document.getElementById('paramsDataModel');

    fw.dataModel({
      namespace: 'paramsDataModel',
      autoRegister: true,
      initialize: function(params) {
        expect(params.testValueOne).to.be(1);
        expect(params.testValueTwo).to.eql([1,2,3]);
        wasInitialized = true;
      }
    });

    expect(wasInitialized).to.be(false);
    fw.start(container);

    setTimeout(function() {
      expect(wasInitialized).to.be(true);
      done();
    }, 0);
  });

  it('calls onDispose when the containing element is removed from the DOM', function() {
    var container = document.getElementById('onDisposeDataModel');
    var onDisposeWasCalled = false;

    var WrapperDataModel = fw.dataModel({
      initialize: function() {
        this.showIt = fw.observable(true);
      }
    });

    var DataModelWithDispose = fw.dataModel({
      namespace: 'DataModelWithDispose',
      autoRegister: true,
      onDispose: function() {
        onDisposeWasCalled = true;
      }
    });

    var wrapper = new WrapperDataModel();
    fw.applyBindings(wrapper, container);

    expect(onDisposeWasCalled).to.be(false);

    wrapper.showIt(false);

    expect(onDisposeWasCalled).to.be(true);
  });

  it('can have a registered location set and retrieved proplerly', function() {
    fw.dataModels.registerLocation('registeredLocationRetrieval', '/bogus/path');
    expect(fw.dataModels.getLocation('registeredLocationRetrieval')).to.be('/bogus/path');
  });

  it('can have a registered location with filename set and retrieved proplerly', function() {
    fw.dataModels.registerLocation('registeredLocationWithFilenameRetrieval', '/bogus/path/__file__.js');
    expect(fw.dataModels.getLocation('registeredLocationWithFilenameRetrieval')).to.be('/bogus/path/__file__.js');
  });

  it('can have a specific file extension set and used correctly', function() {
    fw.dataModels.fileExtensions('.jscript');
    fw.dataModels.registerLocation('registeredLocationWithExtensionRetrieval', '/bogus/path/');

    expect(fw.dataModels.getFileName('registeredLocationWithExtensionRetrieval')).to.be('registeredLocationWithExtensionRetrieval.jscript');

    fw.dataModels.fileExtensions('.js');
  });

  it('can have a callback specified as the extension with it invoked and the return value used', function() {
    fw.dataModels.fileExtensions(function(moduleName) {
      expect(moduleName).to.be('registeredLocationWithFunctionExtensionRetrieval');
      return '.jscriptFunction';
    });
    fw.dataModels.registerLocation('registeredLocationWithFunctionExtensionRetrieval', '/bogus/path/');

    expect(fw.dataModels.getFileName('registeredLocationWithFunctionExtensionRetrieval')).to.be('registeredLocationWithFunctionExtensionRetrieval.jscriptFunction');

    fw.dataModels.fileExtensions('.js');
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

    var container = document.getElementById('AMDPreRegisteredDataModel');
    var dataModelLoaded = false;

    define('AMDPreRegisteredDataModel', ['fw'], function(fw) {
      return fw.dataModel({
        initialization: function() {
          dataModelLoaded = true;
        }
      });
    });

    expect(dataModelLoaded).to.be(false);
    fw.start(container);

    setTimeout(function() {
      expect(dataModelLoaded).to.be(true);
      done();
    }, 40);
  });

  it('can load via registered dataModel with a declarative initialization', function(done) {
    var container = document.getElementById('registeredDataModel');
    var registeredDataModelWasLoaded = false;

    fw.dataModels.register('registeredDataModel', fw.dataModel({
      initialize: function() {
        registeredDataModelWasLoaded = true;
      }
    }));

    expect(registeredDataModelWasLoaded).to.be(false);
    fw.start(container);

    setTimeout(function() {
      expect(registeredDataModelWasLoaded).to.be(true);
      done();
    }, 40);
  });

  it('can load via requirejs with a declarative initialization from a specified location', function(done) {
    var container = document.getElementById('AMDDataModel');
    window.AMDDataModelWasLoaded = false;

    fw.dataModels.registerLocation('AMDDataModel', 'scripts/testAssets/');

    expect(window.AMDDataModelWasLoaded).to.be(false);
    fw.start(container);

    setTimeout(function() {
      expect(window.AMDDataModelWasLoaded).to.be(true);
      done();
    }, 40);
  });

  it('can load via requirejs with a declarative initialization from a specified location with the full file name', function(done) {
    var container = document.getElementById('AMDDataModelFullName');
    window.AMDDataModelFullNameWasLoaded = false;

    fw.dataModels.registerLocation('AMDDataModelFullName', 'scripts/testAssets/AMDDataModelFullName.js');

    expect(window.AMDDataModelFullNameWasLoaded).to.be(false);
    fw.start(container);

    setTimeout(function() {
      expect(window.AMDDataModelFullNameWasLoaded).to.be(true);
      done();
    }, 40);
  });

  it('can specify and load via requirejs with the default location', function(done) {
    var container = document.getElementById('defaultDataModelLocation');
    window.defaultDataModelLocationLoaded = false;

    fw.dataModels.defaultLocation('scripts/testAssets/defaultDataModelLocation/');

    expect(window.defaultDataModelLocationLoaded).to.be(false);

    fw.start(container);

    setTimeout(function() {
      expect(window.defaultDataModelLocationLoaded).to.be(true);
      done();
    }, 40);
  });
});