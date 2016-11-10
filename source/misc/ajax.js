var fw = require('knockout/build/output/knockout-latest');
var _ = require('footwork-lodash');

var util = require('./util');
var resultBound = util.resultBound;
var promiseIsFulfilled = util.promiseIsFulfilled;
var isPromise = util.isPromise;
var privateDataSymbol = util.getSymbol('footwork');

require('../collection/collection-tools');

// Map from CRUD to HTTP for our default `fw.sync` implementation.
var methodMap = {
  'create': 'POST',
  'update': 'PUT',
  'patch':  'PATCH',
  'delete': 'DELETE',
  'read':   'GET'
};

var parseURLRegex = /^(http[s]*:\/\/[a-zA-Z0-9:\.]*)*([\/]{0,1}[\w\.:\/-]*)$/;
var parseParamsRegex = /(:[\w\.]+)/g;
var trailingSlashRegex = /\/$/;

function noURLError () {
  throw Error('A "url" property or function must be specified');
};

/**
 * Creates or returns a promise based on the request specified in requestInfo.
 * This function also manages a requestRunning observable on the entity which indicates when the request finishes.
 * Note that there is an optional requestLull which will make the requestRunning observable stay 'true' for
 * atleast the specified duration. If multiple requests are in progress, then it will wait for all to finish.
 *
 * @param  {string} operationType The type of operation being made, used as key to cache running requests
 * @param  {object} requestInfo   Description of the request to make including a createRequest callback to make a new request
 * @return {Promise}              Ajax Promise
 */
function makeOrGetRequest (operationType, requestInfo) {
  var requestRunning = requestInfo.requestRunning;
  var requestLull = requestInfo.requestLull;
  var entity = requestInfo.entity;
  var createRequest = requestInfo.createRequest;
  var promiseName = operationType + 'Promise';
  var allowConcurrent = requestInfo.allowConcurrent;
  var requests = entity[privateDataSymbol][promiseName] || [];
  var theRequest = _.last(requests);

  if ((allowConcurrent || !fw.isObservable(requestRunning) || !requestRunning()) || !requests.length) {
    theRequest = createRequest();

    if (!isPromise(theRequest)) {
      // returned value from createRequest() is a value not a promise, lets return the value in a promise
      theRequest = Promise.resolve(theRequest);
    }
    theRequest = makePromiseQueryable(theRequest);

    requests.push(theRequest);
    entity[privateDataSymbol][promiseName] = requests;

    requestRunning(true);

    var lullFinished = fw.observable(false);
    var requestFinished = fw.observable(false);
    var requestWatcher = fw.computed(function () {
      if (lullFinished() && requestFinished()) {
        requestRunning(false);
        requestWatcher.dispose();
      }
    });

    requestLull = (_.isFunction(requestLull) ? requestLull(operationType) : requestLull);
    if (requestLull) {
      setTimeout(function () {
        lullFinished(true);
      }, requestLull);
    } else {
      lullFinished(true);
    }

    if (isPromise(theRequest)) {
      theRequest.then(function () {
        if (_.every(requests, promiseIsFulfilled)) {
          requestFinished(true);
          entity[privateDataSymbol].promiseName = [];
        }
      });
    }
  }

  return theRequest;
}

/**
 * Create an xmlhttprequest based on the desired action (read/write/etc), concern (dataModel/collection), and optional params.
 *
 * @param {string} action
 * @param {object} concern
 * @param {object} params
 * @returns {object} htr
 */
function sync (action, concern, params) {
  params = params || {};
  action = action || 'noAction';

  if (!fw.isDataModel(concern) && !fw.isCollection(concern)) {
    throw Error('Must supply a dataModel or collection to fw.sync()');
  }

  if (!_.isString(methodMap[action])) {
    throw Error('Invalid action (' + action + ') specified for sync operation');
  }

  var configParams = concern[privateDataSymbol].configParams;

  // grab the url
  var url = configParams.url;
  if (_.isFunction(url)) {
    url = url.call(concern, action);
  } else if (!_.isString(url)) {
    noURLError();
  }

  // add the :id to the url if needed
  if (fw.isDataModel(concern)) {
    var pkIsSpecifiedByUser = !_.isNull(url.match(':' + configParams.idAttribute));
    var hasQueryString = !_.isNull(url.match(/\?/));
    if (_.includes(['read', 'update', 'patch', 'delete'], action) && configParams.useKeyInUrl && !pkIsSpecifiedByUser && !hasQueryString) {
      // need to append /:id to url
      url = url.replace(trailingSlashRegex, '') + '/:' + configParams.idAttribute;
    }
  }

  // make sure it begins with the baseUrl
  var urlPieces = (url || noURLError()).match(parseURLRegex);
  if (!_.isNull(urlPieces)) {
    var baseURL = urlPieces[1] || '';
    url = baseURL + _.last(urlPieces);
  }

  // replace any interpolated parameters
  if (fw.isDataModel(concern)) {
    var urlParams = url.match(parseParamsRegex);
    if (urlParams) {
      _.each(urlParams, function (param) {
        url = url.replace(param, concern.get(param.substr(1)));
      });
    }
  }

  // construct the fetch options object
  var options = _.extend({
      method: methodMap[action].toUpperCase(),
      body: null,
      headers: {}
    },
    resultBound(fw, 'fetchOptions', concern, [action, concern, params]) || {},
    resultBound(configParams, 'fetchOptions', concern, [action, concern, params]) || {},
    params);

  if (!_.isString(options.method)) {
    throw Error('Invalid action (' + action + ') specified for sync operation');
  }

  if (_.isNull(options.body) && concern && _.includes(['create', 'update', 'patch'], action)) {
    options.headers['content-type'] = 'application/json';
    options.body = JSON.stringify(options.attrs || concern.get());
  }

  var xhr = options.xhr = makePromiseQueryable(fetch(url, options));
  concern.$namespace.publish('_.request', { dataModel: concern, xhr: xhr, options: options });
  return xhr;
};

/**
 * Place isFulfilled/isRejected/isResolved hooks onto a promise which can be used to syncronously determine a promises state.
 *
 * @param {promise} promise
 * @returns {promise} the instrumented promise
 */
function makePromiseQueryable (promise) {
  if (promise.isResolved) {
    return promise;
  }

  var isResolved = false;
  var isRejected = false;

  // Observe the promise, saving the fulfillment in a closure scope.
  var result = promise.then(
    function (v) { isResolved = true; return v; },
    function (e) { isRejected = true; throw e; });
  result.isFulfilled = function () { return isResolved || isRejected; };
  result.isResolved = function () { return isResolved; }
  result.isRejected = function () { return isRejected; }
  return result;
}

/**
 * Take a fetch'd xmlhttprequest and handle the response. Takes into account valid 200-299 response codes.
 * Also handles parse errors in the response which is supposed to be valid JSON.
 *
 * @param {object} xhr
 * @returns {object} xhr with parsed JSON response result
 */
function handleJsonResponse (xhr) {
  return xhr.then(function (response) {
      if(response.ok) {
        var json;
        try {
          json = response.clone().json();
        } catch(e) {}
        return json;
      }
    });
}

fw.fetchOptions = {};

module.exports = {
  sync: sync,
  makeOrGetRequest: makeOrGetRequest,
  handleJsonResponse: handleJsonResponse,
  makePromiseQueryable: makePromiseQueryable
}
