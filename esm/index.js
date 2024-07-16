import { ARRAY, FUNCTION, NULL, OBJECT, UNDEFINED } from 'proxy-target/types';
import * as handlerTraps from 'proxy-target/traps';
import { bound } from 'proxy-target';
import { create, drop } from 'gc-hook';

const { Object, Proxy, Reflect } = globalThis;

const { isArray } = Array;
const { ownKeys } = Reflect;
const { create: extend, hasOwn, values } = Object;

const wrapOf = (ref, type) => (
  type === ARRAY ? ref[0] : (
    type === FUNCTION ? ref() : (
      type === OBJECT ? ref.$ : ref
    )
  )
);

const extendHandler = (handler, type, direct, value) => {
  const descriptors = { type: { value: type } };
  const hasValueOf = hasOwn(handler, 'valueOf');
  for(const trap of values(handlerTraps)) {
    let descriptor = value(handler[trap] || Reflect[trap]);
    if (hasValueOf && trap === handlerTraps.GET) {
      const { valueOf } = handler;
      const { value } = descriptor;
      descriptor = {
        value($, s, ..._) {
          return s === direct ?
            valueOf.call(this, wrapOf($, type)) :
            value.call(this, $, s, ..._);
        }
      };
    }
    descriptors[trap] = descriptor;
  }
  return extend(handler, descriptors);
};

const JSProxy = ($, target, handler, token = $) => {
  if (token === $) {
    switch (typeof $) {
      case OBJECT:
      case UNDEFINED: if (!token) token = false;
      case FUNCTION: break;
      default: {
        token = false;
        if (target === $) target = Object($);
      }
    }
  }
  const p = new Proxy(target, handler);
  const { destruct } = handler;
  return destruct ? create($, destruct, { token, return: p }) : p;
};

const typeOfFor = typesOf => value => {
  const type = typeof value;
  return type === OBJECT ?
    (value ?
      (typesOf.get(value) || (isArray(value) ? ARRAY : OBJECT)) :
      NULL
    ) :
    type;
};

const release = token => (drop(token), token);

export default namespace => {
  const typesOf = new WeakMap;
  const direct = Symbol();
  const proxy = {};
  const utils = {
    proxy,
    release,
    typeOf: typeOfFor(typesOf),
    valueOf: value => (value[direct] ?? value.valueOf()),
  };
  for (const type of ownKeys(namespace)) {
    if (hasOwn(utils, type)) continue;
    const traps = namespace[type];
    switch (type) {
      case ARRAY: {
        const handler = extendHandler(traps, type, direct, value => ({
          value([ $ ], ..._) {
            return value.call(this, $, ..._);
          }
        }));
        proxy[type] = ($, ..._) => JSProxy($, [ $ ], handler, ..._);
        break;
      }
      case FUNCTION: {
        const handler = extendHandler(traps, type, direct, value => ({
          value($, ..._) {
            return value.call(this, $(), ..._);
          }
        }));
        proxy[type] = ($, ..._) => JSProxy($, bound($), handler, ..._);
        break;
      }
      case OBJECT: {
        const handler = extendHandler(traps, type, direct, value => ({
          value({ $ }, ..._) {
            return value.call(this, $, ..._);
          }
        }));
        proxy[type] = ($, ..._) => JSProxy($, { $ }, handler, ..._);
        break;
      }
      default: {
        const handler = extendHandler(traps, type, direct, value => ({
          value
        }));
        proxy[type] = ($, ..._) => {
          const p = JSProxy($, $, handler, ..._);
          typesOf.set(p, type);
          return p;
        };
        break;
      }
    }
  }
  return utils;
};
