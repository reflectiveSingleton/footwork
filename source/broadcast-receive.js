// broadcast-receive.js
// ----------------

function isReceiver(thing) {
  return isObject(thing) && !!thing.__isReceiver;
}

function isBroadcaster(thing) {
  return isObject(thing) && !!thing.__isBroadcaster;
}

//     this.myValue = fw.observable().receiveFrom('NamespaceName' / Namespace, 'varName');
fw.subscribable.fn.receiveFrom = function(namespace, variable) {
  var target = this;
  var observable = this;
  var namespaceSubscriptions = [];
  var isLocalNamespace = false;

  if( isString(namespace) ) {
    namespace = makeNamespace( namespace );
    isLocalNamespace = true;
  }

  if( !isNamespace(namespace) ) {
    throw 'Invalid namespace provided for receiveFrom() observable.';
  }

  observable = fw.computed({
    read: target,
    write: function( value ) {
      namespace.publish( '__change.' + variable, value );
    }
  });

  observable.refresh = function() {
    namespace.publish( '__refresh.' + variable );
    return this;
  };

  namespaceSubscriptions.push( namespace.subscribe( variable, function( newValue ) {
    target( newValue );
  }) );

  var observableDispose = observable.dispose;
  observable.dispose = observable.shutdown = function() {
    invoke(namespaceSubscriptions, 'unsubscribe');
    if( isLocalNamespace ) {
      namespace.shutdown();
    }
    observableDispose.call(observable);
  };

  observable.__isReceiver = true;
  return observable.refresh();
};

//     this.myValue = fw.observable().broadcastAs('NameOfVar');
//     this.myValue = fw.observable().broadcastAs('NameOfVar', isWritable);
//     this.myValue = fw.observable().broadcastAs({ name: 'NameOfVar', writable: true });
//     this.myValue = fw.observable().broadcastAs({ name: 'NameOfVar', namespace: Namespace });
//     this.myValue = fw.observable().broadcastAs({ name: 'NameOfVar', namespace: 'NamespaceName' });
fw.subscribable.fn.broadcastAs = function(varName, option) {
  var observable = this;
  var namespace;
  var subscriptions = [];
  var namespaceSubscriptions = [];
  var isLocalNamespace = false;

  if( isObject(varName) ) {
    option = varName;
  } else {
    if( isBoolean(option) ) {
      option = {
        name: varName,
        writable: option
      };
    } else if( isObject(option) ) {
      option = extend({
        name: varName
      }, option);
    } else {
      option = {
        name: varName
      };
    }
  }

  namespace = option.namespace || currentNamespace();
  if( isString(namespace) ) {
    namespace = makeNamespace(namespace);
    isLocalNamespace = true;
  }

  if( !isNamespace(namespace) ) {
    throw 'Invalid namespace provided for broadcastAs() observable.';
  }

  if( option.writable ) {
    namespaceSubscriptions.push( namespace.subscribe( '__change.' + option.name, function( newValue ) {
      observable( newValue );
    }) );
  }

  observable.broadcast = function() {
    namespace.publish( option.name, observable() );
    return this;
  };

  namespaceSubscriptions.push( namespace.subscribe( '__refresh.' + option.name, function() {
    namespace.publish( option.name, observable() );
  }) );
  subscriptions.push( observable.subscribe(function( newValue ) {
    namespace.publish( option.name, newValue );
  }) );

  observable.dispose = observable.shutdown = function() {
    invoke(namespaceSubscriptions, 'unsubscribe');
    invoke(subscriptions, 'dispose');
    if( isLocalNamespace ) {
      namespace.shutdown();
    }
  };

  observable.__isBroadcaster = true;
  return observable.broadcast();
};