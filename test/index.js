import define from '../esm/index.js';
import { assert, collect } from './utils.js';
import './heap.js';

// 🦄 typeOf coverage related
let { proxy, release, typeOf, valueOf } = define({
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

  // simply ignored ...
  valueOf: {},
});

// typeOf native cases
assert(typeOf([]), 'array');
assert(typeOf(proxy.array(0)), 'array');
assert(typeOf(()=>{}), 'function');
assert(typeOf(proxy.function(0)), 'function');
assert(typeOf({}), 'object');
assert(typeOf(proxy.object(0)), 'object');
assert(valueOf(proxy.object({})).toString(), '[object Object]');

// typeOf extra primitives
assert(typeOf(1n), 'bigint');
assert(typeOf(proxy.bigint(0)), 'bigint');
assert(typeOf(false), 'boolean');
assert(typeOf(proxy.boolean(0)), 'boolean');
assert(typeOf(null), 'null');
assert(typeOf(proxy.null(0)), 'null');
assert(typeOf(1), 'number');
assert(typeOf(proxy.number(0)), 'number');
assert(typeOf(''), 'string');
assert(typeOf(proxy.string(0)), 'string');
assert(typeOf(Symbol()), 'symbol');
assert(typeOf(proxy.symbol(0)), 'symbol');
assert(typeOf(), 'undefined');
assert(typeOf(proxy.undefined(0)), 'undefined');

// typeOf custom direct/defined
assert(typeOf(proxy.direct({})), 'direct');

assert(proxy.bigint(2n) == 2n, true, 'bigint');
assert(proxy.bigint(2n) instanceof BigInt, true, 'bigint instanceof');

// 🦄 define coverage related
assert(proxy.array([1, 2, 3]).length, 3);
assert(proxy.direct([1, 2, 3]).length, 3);
assert(proxy.object({a: 1}).a, 1);
assert(proxy.direct({a: 1}).a, 1);
assert(proxy.function(() => 1)(), 1);
assert(proxy.direct(() => 1)(), 1);

let i = 0;

const gcdo = Object(1);
const gcdd = {b: 2};

const hidden = Symbol('direct');

({ proxy, release, typeOf, valueOf } = define({
  array: {
    valueOf(i) {
      return i;
    }
  },
  function: {
    valueOf(i) {
      return i;
    }
  },
  object: {
    destruct(ref) {
      assert(ref, gcdo.valueOf());
      assert(ref, 1);
      i++;
    },
    valueOf(i) {
      return i;
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
}));

let pgcdo = proxy.object(gcdo.valueOf(), gcdo);
let pgcdd = proxy.direct(gcdd);

await collect();
assert(valueOf(proxy.array(3)), 3);
assert(valueOf(proxy.function(2)), 2);
assert(valueOf(pgcdo), 1);
assert(!!pgcdo, true);
assert(!!pgcdd, true);
pgcdo = pgcdd = null;
await collect();
assert(i, 2);
pgcdo = proxy.object(gcdo.valueOf(), gcdo);
pgcdd = proxy.direct(gcdd);
await collect();
release(gcdo);
release(gcdd);
await collect();
assert(i, 2);
let h = proxy[hidden]({});
assert(h.valueOf(), h);
assert(valueOf(h), 'anything-really');
h = null;
await collect();
assert(i, 3);
console.log('OK');
