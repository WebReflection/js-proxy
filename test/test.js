import { typeOf, proxyOf, valueOf } from '../esm/index.js';

const proxy = proxyOf({
  object: {},
  string: {},
  promise: {},
});

const object = proxy.object({});
const str = proxy.string(new String(''));
const promise = proxy.promise(Promise.resolve(true));

// all true
typeOf(object) === "object";
typeOf(str) === "string";
typeOf(promise) === "promise";
