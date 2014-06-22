(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['lodash', 'knockout'], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require('lodash'), require('knockout'));
  } else {
    root.ko = factory(_, ko);
  }
}(this, function (_, ko) {
  var windowObject = window;
  
  return (function() {
    //import("helpers/root-masks.js");
    _.extend(root, { _: _, ko: ko });

    (function() {
      //import("../../bower_components/apollo/dist/apollo.js");
    }).call(root);

    (function() {
      //import("../../bower_components/riveter/lib/riveter.js");
    }).call(root);

    (function() {
      //import("../../bower_components/conduitjs/lib/conduit.js");
    }).call(root);

    (function() {
      //import("../../bower_components/postal.js/lib/postal.js");
    }).call(root);

    (function(window) {
      //import("../../bower_components/history.js/scripts/bundled-uncompressed/html4+html5/native.history.js");
    }).call(root, windowObject);

    (function() {
      //import("../../bower_components/matches.js/matches.js");
    }).call(root);

    (function() {
      //import("../../bower_components/delegate.js/delegate.js");
    }).call(root);

    return (function footwork(_, ko, postal, Apollo, riveter, delegate) {
      //import("../main.js");
      return ko;
    })(root._, root.ko, root.postal, root.Apollo, root.riveter, root.delegate);
  })();
}));