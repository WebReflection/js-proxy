const { getPrototypeOf, setPrototypeOf } = Object;

const handlers = new WeakMap;

const set = (handlers, handler) => {
  const ws = new WeakSet;
  handlers.set(handler, ws);
  return ws;
};

/**
 * Given a reference `target`, it sets a proxy between that `target`
 * reference and its prototype, allowing interception of all not-own
 * properties. The `handler` will receive the `__proto__` as first
 * argument of any of its trap and, where passed along, the target itself.
 * @template T
 * @param {T} target
 * @param {ProxyHandler<T>} handler
 */
const mitm = (target, handler) => {
  const ws = handlers.get(handler) || set(handlers, handler);
  return ws.has(target) ? target : (
    ws.add(target),
    setPrototypeOf(target, new Proxy(getPrototypeOf(target), handler))
  );
};

export default mitm;
