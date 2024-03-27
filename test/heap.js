import { drop, get, hold } from '../esm/heap.js';
import { assert, collect } from './utils.js';

let o = {};

let id = hold(o);

assert(typeof id, 'number');
assert(id, hold(o));
assert(hold(o), hold(o));
await collect();
assert(get(id), o);

o = null;
await collect();
assert(typeof get(id), 'object');

assert(drop(id), true);
assert(drop(id), false);
await collect();
assert(typeof get(id), 'undefined');

o = {};
assert(id !== hold(o), true);
assert(drop(o), true);
assert(drop(o), false);
assert(drop(id), false);
