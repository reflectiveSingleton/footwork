// framework/entities/dataModel/DataModel.js
// ------------------

var DataModel = function(descriptor, configParams) {
  return {
    runBeforeInit: true,
    _preInit: function(params) {
      params = params || {};
      enterDataModelContext(this);
      var pkField = configParams.idAttribute;
      this.__private('mappings', fw.observable({}));

      this.isDirty = fw.computed(function() {
        return reduce(this.__private('mappings')(), function(isDirty, mappedField) {
          return isDirty || mappedField.isDirty();
        }, false);
      }, this);

      this.isSaving = fw.observable(false);
      this.isFetching = fw.observable(false);
      this.isDestroying = fw.observable(false);

      this.$cid = fw.utils.guid();
      this[pkField] = this.$id = fw.observable(params[pkField]).mapTo(pkField);

      this.isNew = fw.computed(function() {
        return !isUndefined(this.$id()) && !isNull(this.$id());
      }, this);
    },
    mixin: {
      // GET from server and set in model
      fetch: function(options) {
        var dataModel = this;
        var id = this[configParams.idAttribute]();
        if(id) {
          dataModel.isFetching(true);

          // retrieve data dataModel the from server using the id
          var xhr = this.sync('read', dataModel, options);
          (xhr.done || xhr.then).call(xhr, function(response) {
            var parsedResponse = configParams.parse ? configParams.parse(response) : response;
            if(!isUndefined(parsedResponse[configParams.idAttribute])) {
              dataModel.set(parsedResponse);
            }
          });

          return xhr.always(function() {
            dataModel.isFetching(false);
          });
        }
      },

      // PUT / POST / PATCH to server
      save: function(key, val, options) {
        var dataModel = this;
        var attrs = null;

        if(isObject(key)) {
          attrs = key;
          options = val;
        } else {
          (attrs = {})[key] = val;
        }

        if(isObject(options) && isFunction(options.stopPropagation)) {
          // method called as a result of an event binding, ignore its 'options'
          options = {};
        }

        options = extend({
          parse: true,
          wait: false,
          patch: false
        }, options);

        var method = isUndefined(dataModel.$id()) ? 'create' : (options.patch ? 'patch' : 'update');

        if(method === 'patch' && !options.attrs) {
          options.attrs = attrs;
        }

        var syncPromise = dataModel.sync(method, dataModel, options);

        dataModel.isSaving(true);
        (syncPromise.done || syncPromise.then)(function(response) {
          var resourceData = configParams.parse ? configParams.parse(response) : response;

          if(options.wait && !isNull(attrs)) {
            resourceData = extend({}, attrs, resourceData);
          }

          if(isObject(resourceData)) {
            dataModel.set(resourceData);
          }
        });

        if(!options.wait && !isNull(attrs)) {
          dataModel.set(attrs);
        }

        return syncPromise.always(function() {
          dataModel.isSaving(false);
        });;
      },

      // DELETE
      destroy: function(options) {
        if(this.isNew()) {
          return false;
        }

        options = options ? clone(options) : {};
        var dataModel = this;
        var success = options.success;
        var wait = options.wait;

        var destroy = function() {
          dataModel.$namespace.publish('destroy', options);
        };

        dataModel.isDestroying(true);
        var xhr = this.sync('delete', this, options);

        (xhr.done || xhr.then).call(xhr, function() {
          dataModel.$id(undefined);
          if(options.wait) {
            destroy();
          }
        });

        xhr.always(function() {
          dataModel.isDestroying(false);
        });

        if(!options.wait) {
          destroy();
        }

        return xhr;
      },

      // set attributes in model (clears isDirty on observables/fields it saves to by default)
      set: function(key, value, options) {
        var attributes = {};

        if(isString(key)) {
          attributes = insertValueIntoObject(attributes, key, value);
        } else if(isObject(key)) {
          attributes = key;
          options = value;
        }

        options = extend({
          clearDirty: true
        }, options);

        var mappingsChanged = false;
        each(this.__private('mappings')(), function(fieldObservable, fieldMap) {
          var fieldValue = getNestedReference(attributes, fieldMap);
          if(!isUndefined(fieldValue)) {
            fieldObservable(fieldValue);
            mappingsChanged = true;
            options.clearDirty && fieldObservable.isDirty(false);
            this.$namespace.publish('_.change.' + fieldMap, fieldValue);
          }
        }, this);

        if(mappingsChanged && options.clearDirty) {
          // we updated the dirty state of a/some field(s), lets tell the dataModel $dirty computed to (re)run its evaluator function
          this.__private('mappings').valueHasMutated();
        }
      },

      get: function(referenceField, includeRoot) {
        var dataModel = this;
        if(isArray(referenceField)) {
          return reduce(referenceField, function(jsObject, fieldMap) {
            return merge(jsObject, dataModel.get(fieldMap, true));
          }, {});
        } else if(!isUndefined(referenceField) && !isString(referenceField)) {
          throw new Error(dataModel.$namespace.getName() + ': Invalid referenceField [' + typeof referenceField + '] provided to dataModel.get().');
        }

        var mappedObject = reduce(this.__private('mappings')(), function reduceModelToObject(jsObject, fieldObservable, fieldMap) {
          if(isUndefined(referenceField) || ( fieldMap.indexOf(referenceField) === 0 && (fieldMap.length === referenceField.length || fieldMap.substr(referenceField.length, 1) === '.')) ) {
            insertValueIntoObject(jsObject, fieldMap, fieldObservable());
          }
          return jsObject;
        }, {});

        return includeRoot ? mappedObject : getNestedReference(mappedObject, referenceField);
      },

      getData: function() {
        return this.get();
      },

      toJSON: function() {
        return JSON.stringify(this.getData());
      },

      clean: function(field) {
        if(!isUndefined(field)) {
          var fieldMatch = new RegExp('^' + field + '$|^' + field + '\..*');
        }
        each(this.__private('mappings')(), function(fieldObservable, fieldMap) {
          if(isUndefined(field) || fieldMap.match(fieldMatch)) {
            fieldObservable.isDirty(false);
          }
        });
      },

      sync: function() {
        return fw.sync.apply(this, arguments);
      },

      hasMappedField: function(referenceField) {
        return !!this.__private('mappings')()[referenceField];
      },

      dirtyMap: function() {
        var tree = {};
        each(this.__private('mappings')(), function(fieldObservable, fieldMap) {
          tree[fieldMap] = fieldObservable.isDirty();
        });
        return tree;
      }
    },
    _postInit: function() {
      if(configParams.autoIncrement) {
        this.$rootNamespace.request.handler('get', function() { return this.get(); }.bind(this));
      }
      this.$namespace.request.handler('get', function() { return this.get(); }.bind(this));

      exitDataModelContext();
    }
  };
};
