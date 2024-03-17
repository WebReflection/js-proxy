import * as handlerTraps from 'proxy-target/traps';
import * as handlerTypes from 'proxy-target/types';
import { bound } from 'proxy-target';
import { create, drop } from 'gc-hook';

const { ARRAY, FUNCTION, NULL, OBJECT } = handlerTypes;
const { Object, Proxy, Reflect } = globalThis;

const { isArray } = Array;
const { create: extend, entries, values } = Object;

const traps = new Set([...values(handlerTraps)]);
const types = new Set([...values(handlerTypes)]);
const typesOf = new WeakMap;

const extendHandler = (handler, type, value) => {
  const descriptors = { type: { value: type } };
  for(const trap of traps)
    descriptors[trap] = value(handler[trap] || Reflect[trap]);
  return extend(handler, descriptors);
};

const proxy = ($, target, handler, token = false) => {
  const p = new Proxy(target, handler);
  const { destruct } = handler;
  return destruct ? create($, destruct, { token, return: p }) : p;
};

export const proxyOf = namespace => {
  const proxies = { free: token => drop(token) };
  for (const [type, traps] of entries(namespace)) {
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
        if (types.has(type)) {
          const handler = extendHandler(traps, type, method => ({
            value($, ..._) {
              return method.call(this, $.valueOf(), ..._);
            }
          }));
          proxies[type] = ($, ..._) => {
            const p = proxy($, Object($), handler, ..._);
            typesOf.set(p, type);
            return p;
          };
        }
        else {
          const handler = extendHandler(traps, type, value => ({ value }));
          proxies[type] = ($, token = $) => {
            const p = proxy($, $, handler, token);
            typesOf.set(p, type);
            return p;
          };
        }
        break;
      }
    }
  }
  return proxies;
};

export const typeOf = value => {
  let type = typeof value;
  if (type === OBJECT) {
    type = value === null ?
      NULL :
      (isArray(value) ? ARRAY : (typesOf.get(value) || OBJECT))
    ;
  }
  return type;
};
