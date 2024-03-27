import { NUMBER } from 'proxy-target/types';

let uid = 0;
const ids = new Map;
const values = new Map;

/**
 * Remove by id or value any previously stored reference.
 * @param {number | unknown} id the held value by id or the value itself.
 * @returns {boolean} `true` if the operation was successful, `false` otherwise.
 */
export const drop = id => {
  const [a, b] = typeof id === NUMBER ? [values, ids] : [ids, values];
  const had = a.has(id);
  if (had) {
    b.delete(a.get(id));
    a.delete(id);
  }
  return had;
};

/**
 * Return the held value reference by its unique identifier.
 * @param {number} id the unique identifier for the value reference.
 * @returns {unknown} the related value / reference or undefined.
 */
export const get = id => values.get(id);

/**
 * Create once a unique number id for a generic value reference.
 * @param {unknown} value a reference used to create a unique identifier.
 * @returns {number} a unique identifier for that reference.
 */
export const hold = value => {
  if (!ids.has(value)) {
    let id;
    // a bit apocalyptic scenario but if this thread runs forever
    // and the id does a whole int32 roundtrip we might have still
    // some reference dangling around
    while (/* c8 ignore next */ values.has(id = uid++));
    ids.set(value, id);
    values.set(id, value);
  }
  return ids.get(value);
};
