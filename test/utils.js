export const assert = (current, expected, message = `expected ${expected} - got ${current}`) => {
  if (!Object.is(current, expected))
    throw new Error(message);
};

export const collect = () => {
  gc();
  return new Promise(resolve => {
    setTimeout(() => {
      gc();
      resolve();
    }, 100);
  });
};
