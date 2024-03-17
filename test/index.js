import { typeOf, proxyOf } from '../esm/index.js';

// 🦄 typeOf coverage related
let proxied = proxyOf({
  // native cases
  array: {},
  function: {},
  object: {},

  // extra primitives
  bigint: {
    get(target, key) {
      const value = target[key];
      return typeof value === 'function' ?
              value.bind(target) : value;
    },
    getPrototypeOf: () => BigInt.prototype,
  },
  boolean: {},
  null: {},
  number: {},
  string: {},
  symbol: {},
  undefined: {},

  // custom direct/defined
  direct: {},
});

// typeOf native cases
console.assert(typeOf([]) === 'array');
console.assert(typeOf(proxied.array(0)) === 'array');
console.assert(typeOf(()=>{}) === 'function');
console.assert(typeOf(proxied.function(0)) === 'function');
console.assert(typeOf({}) === 'object');
console.assert(typeOf(proxied.object(0)) === 'object');

// typeOf extra primitives
console.assert(typeOf(1n) === 'bigint');
console.assert(typeOf(proxied.bigint(0)) === 'bigint');
console.assert(typeOf(false) === 'boolean');
console.assert(typeOf(proxied.boolean(0)) === 'boolean');
console.assert(typeOf(null) === 'null');
console.assert(typeOf(proxied.null(0)) === 'null');
console.assert(typeOf(1) === 'number');
console.assert(typeOf(proxied.number(0)) === 'number');
console.assert(typeOf('') === 'string');
console.assert(typeOf(proxied.string(0)) === 'string');
console.assert(typeOf(Symbol()) === 'symbol');
console.assert(typeOf(proxied.symbol(0)) === 'symbol');
console.assert(typeOf() === 'undefined');
console.assert(typeOf(proxied.undefined({})) === 'undefined');

// typeOf custom direct/defined
console.assert(typeOf(proxied.direct({})) === 'direct');

console.assert(proxied.bigint(2n) == 2n);
console.assert(proxied.bigint(2n) instanceof BigInt);
