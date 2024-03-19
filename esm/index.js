import * as handlerTraps from 'proxy-target/traps';

import { ARRAY, FUNCTION, NULL, OBJECT, UNDEFINED } from 'proxy-target/types';

import { bound } from 'proxy-target';
import { create, drop } from 'gc-hook';

const { Object, Proxy, Reflect } = globalThis;

const { isArray } = Array;
const { ownKeys } = Reflect;
const { create: extend, values } = Object;

const traps = new Set([...values(handlerTraps)]);
const typesOf = new WeakMap;

const extendHandler = (handler, type, value) => {
  const descriptors = { type: { value: type } };
  for(const trap of traps)
    descriptors[trap] = value(handler[trap] || Reflect[trap]);
  return extend(handler, descriptors);
};

const proxy = ($, target, handler, token = $) => {
  if (token === $) {
    switch (typeof $) {
      case OBJECT:
      case FUNCTION:
      case UNDEFINED: break;
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

export const proxyOf = namespace => {
  const proxies = { free: token => drop(token) };
  for (const type of ownKeys(namespace)) {
    const traps = namespace[type];
    switch (type) {
      case ARRAY: {
        const handler = extendHandler(traps, type, method => ({
          value([ $ ], ..._) {
            return method.call(this, $, ..._);
          }
        }));
        proxies[type] = ($, ..._) => proxy($, [ $ ], handler, ..._);
        break;
      }
      case FUNCTION: {
        const handler = extendHandler(traps, type, method => ({
          value($, ..._) {
            return method.call(this, $(), ..._);
          }
        }));
        proxies[type] = ($, ..._) => proxy($, bound($), handler, ..._);
        break;
      }
      case OBJECT: {
        const handler = extendHandler(traps, type, method => ({
          value({ $ }, ..._) {
            return method.call(this, $, ..._);
          }
        }));
        proxies[type] = ($, ..._) => proxy($, { $ }, handler, ..._);
        break;
      }
      default: {
        const handler = extendHandler(traps, type, value => ({ value }));
        proxies[type] = ($, ..._) => {
          const p = proxy($, $, handler, ..._);
          typesOf.set(p, type);
          return p;
        };
        break;
      }
    }
  }
  return proxies;
};

export const typeOf = value => {
  const type = typeof value;
  return type === OBJECT ?
    (value ?
      (typesOf.get(value) || (
        isArray(value) ? ARRAY : OBJECT
      )) :
      NULL
    ) :
    type;
};
