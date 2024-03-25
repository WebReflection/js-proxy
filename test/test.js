import define from '../esm/index.js';


const { proxy, release } = define({
  object: {
    destruct(ref) {
      // {_ref: 123} in case No.1
      // 456 in case No.2
      console.log(ref, 'proxy is gone');
    },
  },
});

// case No.1
const trapped1 = {_ref: 123};
let proxied1 = proxy.object(trapped1);
//setTimeout(release, 500, trapped1);

// case No.2
const trapped2 = 456;
const token2 = Object(456);
let proxied2 = proxy.object(trapped2, token2);
//setTimeout(release, 500, token2);

setTimeout(gc, 1000);
