define(['footwork', 'lodash', 'jquery', 'tools', 'fetch-mock'],
  function(fw, _, $, tools, fetchMock) {
    describe('namespace', function() {
      beforeEach(tools.prepareTestEnv);
      afterEach(tools.cleanTestEnv);

      it('has the ability to create a namespace', function() {
        var namespace = fw.namespace('testNamespaceCreation');
        expect(namespace).toBeAn('object');
        expect(namespace.publish).toBeA('function');
        expect(namespace.subscribe).toBeA('function');
        expect(namespace.getName()).toBe('testNamespaceCreation');
      });

      it('can create a namespace which we can then use to .getName()', function() {
        var namespaceName = tools.generateNamespaceName();
        var namespace = fw.namespace(namespaceName);
        expect(namespace.getName()).toBe(namespaceName);
      });

      it('has basic pub/sub capability', function() {
        var namespace = fw.namespace(tools.generateNamespaceName());
        var testValue = tools.randomString();
        var subscriptionCallbackSpy;
        var testContext = { testContext: true };

        namespace.subscribe('testMessageTopic', tools.expectCallOrder(0, subscriptionCallbackSpy = jasmine.createSpy('subscriptionCallbackSpy', function(value) {
          expect(value).toBe(testValue);
          expect(this).toBe(testContext);
        })), testContext);

        expect(subscriptionCallbackSpy).not.toHaveBeenCalled();
        namespace.publish('testMessageTopic', testValue);
        expect(subscriptionCallbackSpy).toHaveBeenCalled();
      });

      it('can unsubscribe from a subscription', function() {
        var namespace = fw.namespace(tools.generateNamespaceName());
        var subscriptionCallbackSpy = jasmine.createSpy('subscriptionCallbackSpy');

        var subscription = namespace.subscribe('testMessageTopic', tools.expectCallOrder(0, subscriptionCallbackSpy));

        expect(subscriptionCallbackSpy).not.toHaveBeenCalled();

        namespace.publish('testMessageTopic');
        expect(subscriptionCallbackSpy).toHaveBeenCalledTimes(1);

        namespace.unsubscribe(subscription);
        namespace.publish('testMessageTopic');
        expect(subscriptionCallbackSpy).toHaveBeenCalledTimes(1);
      });

      it('has basic pub/sub capability between different instances on the same namespace', function() {
        var namespaceName = tools.generateNamespaceName();
        var namespace1 = fw.namespace(namespaceName);
        var namespace2 = fw.namespace(namespaceName);
        var subscriptionCallbackSpy;
        var testValue = tools.randomString();

        namespace1.subscribe('testMessageTopic', tools.expectCallOrder(0, subscriptionCallbackSpy = jasmine.createSpy('', function(parameter) {
          expect(parameter).toBe(testValue);
        }).and.callThrough()));

        expect(subscriptionCallbackSpy).not.toHaveBeenCalled();

        namespace2.publish('testMessageTopic', testValue);

        expect(subscriptionCallbackSpy).toHaveBeenCalled();
      });

      it('can trigger, respond, and listen to requests', function() {
        var namespace = fw.namespace(tools.generateNamespaceName());
        var handlerCallbackSpy;

        var testContext = { textContext: true };
        namespace.requestHandler('testRequest', handlerCallbackSpy = jasmine.createSpy('handlerCallbackSpy', function(parameter) {
          expect(parameter).toBe('optionalParam');
          expect(this).toBe(testContext);
          return 'all-ok';
        }).and.callThrough(), testContext);

        expect(handlerCallbackSpy).not.toHaveBeenCalled();
        expect(namespace.request('testRequest', 'optionalParam')).toBe('all-ok');
        expect(handlerCallbackSpy).toHaveBeenCalled();
      });

      it('can unregister handler for request', function() {
        var namespace = fw.namespace(tools.generateNamespaceName());
        var handlerCallbackSpy;
        var responseValue = 'all-ok';

        var requestHandler = namespace.requestHandler('testUnregisteredRequest', tools.expectCallOrder(0, handlerCallbackSpy = jasmine.createSpy('handlerCallbackSpy', function(parameter) {
          expect(parameter).toBe('optionalParam');
          return responseValue;
        }).and.callThrough()));

        expect(handlerCallbackSpy).not.toHaveBeenCalled();
        expect(namespace.request('testUnregisteredRequest', 'optionalParam')).toBe(responseValue);
        expect(handlerCallbackSpy).toHaveBeenCalledTimes(1);

        requestHandler.dispose();

        expect(namespace.request('testUnregisteredRequest', 'optionalParam')).toBe(undefined);
        expect(handlerCallbackSpy).toHaveBeenCalledTimes(1);
      });

      it('can make requests and listen to multiple responses', function() {
        var namespaceName = tools.generateNamespaceName();
        var namespaces = _.map([1,2,3], function() {
          return fw.namespace(namespaceName);
        });

        var handlerCallbackSpy = jasmine.createSpy('handlerCallbackSpy', function(parameter) {
          expect(parameter).toBe('optionalParam');
          return 'all-ok';
        }).and.callThrough();

        _.each(namespaces, function(namespace, indexNumber) {
          namespace.requestHandler('testMultipleRequest', tools.expectCallOrder(indexNumber, handlerCallbackSpy));
        });

        var namespace = fw.namespace(namespaceName);
        expect(namespace.request('testMultipleRequest', 'optionalParam', true)).toEqual(['all-ok', 'all-ok', 'all-ok']);
      });

      it('can unregister subscription handlers when namespace is disposed', function() {
        var namespace = fw.namespace(tools.generateNamespaceName());
        var handlerCallbackSpy = jasmine.createSpy('handlerCallbackSpy');

        namespace.subscribe('testDispose', tools.expectCallOrder(0, handlerCallbackSpy));

        expect(handlerCallbackSpy).not.toHaveBeenCalled();

        namespace.publish('testDispose');
        expect(handlerCallbackSpy).toHaveBeenCalledTimes(1);
        namespace.dispose();

        namespace.publish('testDispose');
        expect(handlerCallbackSpy).toHaveBeenCalledTimes(1);
      });

      it('can unregister event handlers when namespace is disposed', function() {
        var namespace = fw.namespace(tools.generateNamespaceName());
        var handlerCallbackSpy = jasmine.createSpy('handlerCallbackSpy');

        namespace.subscribe('testDispose', tools.expectCallOrder(0, handlerCallbackSpy));

        expect(handlerCallbackSpy).not.toHaveBeenCalled();

        namespace.publish('testDispose');
        expect(handlerCallbackSpy).toHaveBeenCalledTimes(1);
        namespace.dispose();

        namespace.publish('testDispose');
        expect(handlerCallbackSpy).toHaveBeenCalledTimes(1);
      });

      it('can unregister request handlers when namespace is disposed', function() {
        var namespace = fw.namespace(tools.generateNamespaceName());
        var handlerCallbackSpy;
        var testValue = tools.randomString();

        namespace.requestHandler('testDispose', tools.expectCallOrder(0, handlerCallbackSpy = jasmine.createSpy('handlerCallbackSpy', function() {
          return testValue;
        }).and.callThrough()));

        expect(handlerCallbackSpy).not.toHaveBeenCalled();

        expect(namespace.request('testDispose')).toBe(testValue);
        expect(handlerCallbackSpy).toHaveBeenCalledTimes(1);
        namespace.dispose();

        expect(namespace.request('testDispose')).not.toBe(testValue);
        expect(handlerCallbackSpy).toHaveBeenCalledTimes(1);
      });
    });
  }
);
