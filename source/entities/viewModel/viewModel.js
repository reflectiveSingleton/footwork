var fw = require('knockout/build/output/knockout-latest');
var _ = require('footwork-lodash');

var util = require('../../misc/util');
var capitalizeFirstLetter = util.capitalizeFirstLetter;
var getSymbol = util.getSymbol;

var entityName = 'viewModel';
var isEntityDuckTag = getSymbol('is' + capitalizeFirstLetter(entityName));

fw[entityName] = {
  boot: require('./viewModel-bootstrap'),
  fileExtensions: '.js',
  defaultConfig: {
    namespace: undefined,
    afterRender: _.noop,
    afterResolve: function resolveImmediately (resolveNow) {
      resolveNow(true);
    },
    sequenceAnimations: false,
    onDispose: _.noop
  }
};

var descriptor = {
  tagName: entityName.toLowerCase(),
  entityName: entityName,
  resource: fw[entityName],
  isEntityDuckTag: isEntityDuckTag,
  isEntity: function (thing) {
    return _.isObject(thing) && !!thing[isEntityDuckTag];
  },
  registeredLocations: {},
  registered: {},
  referenceNamespace: getSymbol(entityName)
};

require('../resource-tools')(descriptor);
require('../entity-descriptors').push(descriptor);

fw['is' + capitalizeFirstLetter(entityName)] = descriptor.isEntity;


