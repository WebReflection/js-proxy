import { typeOf, proxyOf, valueOf } from '../esm/index.js';
import { assert, collect } from './utils.js';
import './heap.js';

// 🦄 typeOf coverage related
let proxied = proxyOf({
  // native cases
  array: {},
  function: {},
  object: {},

  // custom primitives
  bigint: {
    get(target, key, ..._) {
      return key === Symbol.toPrimitive ?
              () => target.valueOf() :
              Reflect.get(target, key, ..._);
    },
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
assert(typeOf([]), 'array');
assert(typeOf(proxied.array(0)), 'array');
assert(typeOf(()=>{}), 'function');
assert(typeOf(proxied.function(0)), 'function');
assert(typeOf({}), 'object');
assert(typeOf(proxied.object(0)), 'object');
assert(valueOf(proxied.object({})).toString(), '[object Object]');

// typeOf extra primitives
assert(typeOf(1n), 'bigint');
assert(typeOf(proxied.bigint(0)), 'bigint');
assert(typeOf(false), 'boolean');
assert(typeOf(proxied.boolean(0)), 'boolean');
assert(typeOf(null), 'null');
assert(typeOf(proxied.null(0)), 'null');
assert(typeOf(1), 'number');
assert(typeOf(proxied.number(0)), 'number');
assert(typeOf(''), 'string');
assert(typeOf(proxied.string(0)), 'string');
assert(typeOf(Symbol()), 'symbol');
assert(typeOf(proxied.symbol(0)), 'symbol');
assert(typeOf(), 'undefined');
assert(typeOf(proxied.undefined(0)), 'undefined');

// typeOf custom direct/defined
assert(typeOf(proxied.direct({})), 'direct');

assert(proxied.bigint(2n) == 2n, true, 'bigint');
assert(proxied.bigint(2n) instanceof BigInt, true, 'bigint instanceof');

// 🦄 proxyOf coverage related
assert(proxied.array([1, 2, 3]).length, 3);
assert(proxied.direct([1, 2, 3]).length, 3);
assert(proxied.object({a: 1}).a, 1);
assert(proxied.direct({a: 1}).a, 1);
assert(proxied.function(() => 1)(), 1);
assert(proxied.direct(() => 1)(), 1);

let i = 0;

const gcdo = Object(1);
const gcdd = {b: 2};

const hidden = Symbol('direct');

proxied = proxyOf({
  object: {
    destruct(ref) {
      assert(ref, gcdo.valueOf());
      assert(ref, 1);
      i++;
    }
  },
  direct: {
    destruct(ref) {
      assert(ref, gcdd);
      i++;
    }
  },
  [hidden]: {
    destruct() {
      i++;
    },
    valueOf() {
      return 'anything-really';
    },
  },
});


let pgcdo = proxied.object(gcdo.valueOf(), gcdo);
let pgcdd = proxied.direct(gcdd);

await collect();
assert(!!pgcdo, true);
assert(!!pgcdd, true);
pgcdo = pgcdd = null;
await collect();
assert(i, 2);
pgcdo = proxied.object(gcdo.valueOf(), gcdo);
pgcdd = proxied.direct(gcdd);
await collect();
proxied.free(gcdo);
proxied.free(gcdd);
await collect();
assert(i, 2);
let h = proxied[hidden]({});
assert(h.valueOf(), h);
assert(valueOf(h), 'anything-really');
h = null;
await collect();
assert(i, 3);
console.log('OK');
