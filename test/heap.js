import { free, get, hold } from '../esm/heap.js';
import { assert, collect } from './utils.js';

let o = {};

let id = hold(o);

assert(typeof id, 'number');
await collect();
assert(get(id), o);

o = null;
await collect();
assert(typeof get(id), 'object');

assert(free(id), true);
assert(free(id), false);
await collect();
assert(typeof get(id), 'undefined');

o = {};
assert(id !== hold(o), true);
assert(free(o), true);
assert(free(o), false);
assert(free(id), false);
