import { assert } from './utils.js';
import mitm from '../esm/mitm.js';

const calls = [];

const handler = {
  test: Math.random(),
  get(__proto__, name, target) {
    calls.push(name);
    if (name === 'test')
      return this.test;
    return Reflect.get(__proto__, name, target);
  }
};

let object = mitm({own: 'OK'}, handler);
assert(object, mitm(object, handler));
calls.splice(0);

assert(object.own, 'OK');
assert(calls.length, 0);

assert(object.test, handler.test);
assert(calls.length, 1);
assert(calls.splice(0).join(','), 'test');

object = mitm(object, {
  get(__proto__, name, target) {
    calls.push(name);
    if (name === 'extra')
      return 123;
    return Reflect.get(__proto__, name, target);
  }
});

assert(object.extra, 123);
assert(calls.length, 1);
assert(calls.splice(0).join(','), 'extra');

assert(object.test, handler.test);
assert(calls.length, 2);
assert(calls.splice(0).join(','), 'test,test');
