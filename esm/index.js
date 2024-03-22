import { ARRAY, FUNCTION, NULL, OBJECT, UNDEFINED } from 'proxy-target/types';
import * as handlerTraps from 'proxy-target/traps';
import { bound } from 'proxy-target';
import { create, drop } from 'gc-hook';

const { Object, Proxy, Reflect } = globalThis;

const { isArray } = Array;
const { ownKeys } = Reflect;
const { create: extend, hasOwn, values } = Object;

const traps = new Set([...values(handlerTraps)]);
const typesOf = new WeakMap;
const direct = Symbol();

const extendHandler = (handler, type, value) => {
  const descriptors = { type: { value: type } };
  const hasValueOf = hasOwn(handler, 'valueOf');
  for(const trap of traps) {
    let descriptor = value(handler[trap] || Reflect[trap]);
    if (hasValueOf && trap === handlerTraps.GET) {
      const { valueOf } = handler;
      const { value } = descriptor;
      descriptor = {
        value($, s, ..._) {
          return s === direct ?
            valueOf.call(this, $) :
            value.call(this, $, s, ..._);
        }
      };
    }
    descriptors[trap] = descriptor;
  }
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
      (typesOf.get(value) || (isArray(value) ? ARRAY : OBJECT)) :
      NULL
    ) :
    type;
};

/**
 * @template T the value held by the proxy
 * @param {T} value a proxied value or a regular
 * @returns {T}
 */
export const valueOf = value => (value[direct] || value.valueOf());
