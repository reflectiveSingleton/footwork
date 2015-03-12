/**
 * This is for creating a custom build of lodash which only includes the dependencies that footwork needs
 */
root._ = {
  isFunction: require('../../node_modules/lodash/lang/isFunction'),
  isObject: require('../../node_modules/lodash/lang/isObject'),
  isString: require('../../node_modules/lodash/lang/isString'),
  isBoolean: require('../../node_modules/lodash/lang/isBoolean'),
  isNumber: require('../../node_modules/lodash/lang/isNumber'),
  isUndefined: require('../../node_modules/lodash/lang/isUndefined'),
  isArray: require('../../node_modules/lodash/lang/isArray'),
  isNull: require('../../node_modules/lodash/lang/isNull'),
  contains: require('../../node_modules/lodash/collection/contains'),
  extend: require('../../node_modules/lodash/object/extend'),
  pick: require('../../node_modules/lodash/object/pick'),
  each: require('../../node_modules/lodash/collection/each'),
  filter: require('../../node_modules/lodash/collection/filter'),
  bind: require('../../node_modules/lodash/function/bind'),
  invoke: require('../../node_modules/lodash/collection/invoke'),
  clone: require('../../node_modules/lodash/lang/clone'),
  reduce: require('../../node_modules/lodash/collection/reduce'),
  has: require('../../node_modules/lodash/object/has'),
  where: require('../../node_modules/lodash/collection/where'),
  result: require('../../node_modules/lodash/object/result'),
  uniqueId: require('../../node_modules/lodash/utility/uniqueId'),
  map: require('../../node_modules/lodash/collection/map'),
  find: require('../../node_modules/lodash/collection/find'),
  omit: require('../../node_modules/lodash/object/omit'),
  indexOf: require('../../node_modules/lodash/array/indexOf'),
  values: require('../../node_modules/lodash/object/values'),
  reject: require('../../node_modules/lodash/collection/reject'),
  findWhere: require('../../node_modules/lodash/collection/findWhere'),
  once: require('../../node_modules/lodash/function/once'),
  last: require('../../node_modules/lodash/array/last'),
  isEqual: require('../../node_modules/lodash/lang/isEqual'),
  defaults: require('../../node_modules/lodash/object/defaults'),
  noop: require('../../node_modules/lodash/utility/noop'),

  // required for postal.js specifically (ref: postal.js/lib/postal.lodash.js)
  keys: require('../../node_modules/lodash/object/keys'),
  after: require('../../node_modules/lodash/function/after'),
  any: require('../../node_modules/lodash/collection/any'),
  debounce: require('../../node_modules/lodash/function/debounce'),
  throttle: require('../../node_modules/lodash/function/throttle')
};