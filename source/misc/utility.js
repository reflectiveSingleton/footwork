// misc/utility.js
// ----------------

// misc regex patterns
var trailingSlashRegex = /\/$/;
var startingSlashRegex = /^\//;
var startingHashRegex = /^#/;

// misc utility functions
var noop = function() { };

var isObservable = fw.isObservable;

function isPath(pathOrFile) {
  return isString(pathOrFile) && trailingSlashRegex.test(pathOrFile);
};

function hasPathStart(path) {
  return isString(path) && startingSlashRegex.test(path);
};

function hasHashStart(string) {
  return isString(string) && startingHashRegex.test(string);
}

function getFilenameExtension(fileName) {
  var extension = '';
  if(fileName.indexOf('.') !== -1) {
    var parts = fileName.split('.');
    extension = parts[parts.length - 1];
  }
  return extension;
}

function alwaysPassPredicate() { return true; }
function emptyStringResult() { return ''; }

// Internal registry which stores the mixins that are automatically added to each model
var modelMixins = [];

// dispose a known property type
function propertyDisposal( property, name ) {
  if( (isNamespace(property) || isRouter(property) || isBroadcastable(property) || isReceivable(property) || isObservable(property)) && isFunction(property.dispose) ) {
    property.dispose();
  }
}

// parseUri() originally sourced from: http://blog.stevenlevithan.com/archives/parseuri
function parseUri(str) {
  var options = parseUri.options;
  var matchParts = options.parser[ options.strictMode ? "strict" : "loose" ].exec(str);
  var uri = {};
  var i = 14;

  while (i--) {
    uri[ options.key[i] ] = matchParts[i] || "";
  }

  uri[ options.q.name ] = {};
  uri[ options.key[12] ].replace(options.q.parser, function ($0, $1, $2) {
    if($1) {
      uri[options.q.name][$1] = $2;
    }
  });

  return uri;
};

parseUri.options = {
  strictMode: false,
  key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
  q: {
    name:   "queryKey",
    parser: /(?:^|&)([^&=]*)=?([^&]*)/g
  },
  parser: {
    strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
    loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
  }
};

// fw.utils exports
var isFullURLRegex = /(^[a-z]+:\/\/|^\/\/)/i;
var isFullURL = fw.utils.isFullURL = function(thing) {
  return isString(thing) && isFullURLRegex.test(thing);
};

// Generate a random pseudo-GUID
// http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
var guid = fw.utils.guid = (function() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
               .toString(16)
               .substring(1);
  }
  return function() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
           s4() + '-' + s4() + s4() + s4();
  };
})();