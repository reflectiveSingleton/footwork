var fw = require('../bower_components/knockoutjs/dist/knockout');

require('./init');
require('./binding/start');

fw.sync = require('./sync');
fw.namespace = require('./namespace');
fw.embed = require('./embed-exports');

require('./broadcastable-receivable');

var ViewModel = require('./entities/ViewModel');
var DataModel = require('./entities/DataModel');
var Router = require('./entities/Router');

module.exports = fw;