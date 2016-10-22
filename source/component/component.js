var _ = require('lodash');

var fw = require('knockout/build/output/knockout-latest');

require('./lifecycle-binding');
require('./entity-loader');
require('./component-lifecycle-loader');
require('./component-resource-loader');
require('./component-init');

var entityDescriptors = require('../entities/entity-descriptors');

fw.components.getComponentNameForNode = function(node) {
  var tagName = _.isString(node.tagName) && node.tagName.toLowerCase();

  if(fw.components.isRegistered(tagName)
     || fw.components.locationIsRegistered(tagName)
     || entityDescriptors.tagNameIsPresent(tagName)) {
    return tagName;
  }

  return null;
};
