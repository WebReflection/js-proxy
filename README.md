[![build status](https://github.com/WebReflection/js-proxy/actions/workflows/node.js.yml/badge.svg)](https://github.com/WebReflection/js-proxy/actions) [![Coverage Status](https://coveralls.io/repos/github/WebReflection/js-proxy/badge.svg?branch=main)](https://coveralls.io/github/WebReflection/js-proxy?branch=main)

<sup>**Social Media Photo by [Vinu T](https://unsplash.com/@happy_pixel?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash) on [Unsplash](https://unsplash.com/photos/a-small-waterfall-in-the-middle-of-a-forest-DHo1nNUI0y4?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash)**</sup>

The one-stop shop solution for JS Proxies and FFI APIs.

**[Documentation](https://webreflection.github.io/js-proxy/)**

## API

<details id="proxy-of" open>
  <summary><strong style="font-size:1.5rem">proxyOf(namespace)</strong></summary>
  <div markdown=1>

This export provides an utility to define various handlers for any kind of proxied value.

Each handler can have zero, one or more [proxy traps](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy#handler_functions) *plus* the following extra handlers:

  * **destruct** which, if present, will orchestrate automatically a [FinalizationRegistry](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry) logic to invoke such trap once its proxied value is not used anymore in the wild.
  * **valueOf** which, if present, allows the `valueOf(proxy)` utility to retrieve directly the underlying proxied value.

> 📝 **Important**
> 
> If the namespace contains `object`, `array`, or `function` as own entries the value can be either a reference to those types or actually a number or any other primitive which goal is to reflect proxies across worlds (boundaries, workers, realms, interpreters).
> 
> Any other name will simply directly accept references, but not primitives, still providing the special methods that are indeed available to every type of proxy.

<h3>Example</h3>

```js
import { proxyOf, valueOf, typeOf } from 'js-proxy';

const proxiedValue = proxiedValue => proxiedValue;

const proxy = proxyOf({
  object: { valueOf: proxiedValue },
  array: { valueOf: proxiedValue },
  function: { valueOf: proxiedValue },
  direct: {
    destruct(ref) {
      console.log('this reference is no longer needed', ref);
    }
  },
});

// object, array and function always act
// like proxies and values for objects, arrays or functions
// any other namespace entry uses directly the referenced value.
const object = proxy.object([]);
const array = proxy.array({});
const fn = proxy.function(123);

let any = proxy.direct({});

// all true
typeOf(object) === "object" && !Array.isArray(object);
typeOf(array) === "array" && Array.isArray(array);
typeOf(fn) === "function" && typeof fn === "function";
typeOf(any) === "direct"; // <-- !!!

// retrieve the original value
valueOf(object).length; // 0
valueOf(fn) === 123;    // true

// no valueOf trap defined:
valueOf(any) === any;   // true

any = null;
// will eventually log:
// "this reference is no longer needed", {}
```

The reason for `object`, `array`, and `function` to have a special treatment is the fact both `typeof` and `Array.isArray` can actually drill into the proxied type so that this module guarantees that if you meant to proxy an *array* or a *function*, these will reflect their entity across introspection related operations, also providing a way to simply proxy memory addresses or any other kind of identity, and deal with [Foregn Function Interfaces](https://en.wikipedia.org/wiki/Foreign_function_interface) for non *JS* related programming languages.

  </div>
</details>

<details id="type-of" open>
  <summary><strong style="font-size:1.5rem">typeOf(unknown)</strong></summary>
  <div markdown=1>

Differently from the [typeof operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof), the `typeOf` in this module does the following:

  * it retrieves the current `typeof` of the generic, *unknown*, value
  * if the resulting *type* is `"object"`:
    * if the namespace had such type defined in it, it returns that brand name instead
    * if the value is an *array*, it returns `"array"`
    * if the value is `null`, it returns `"null"`
  * otherwise returns the string that `typeof` initially returned

> ℹ️ **Note**
> 
> This utility is not necessarily just handy with this module but it's especially handy to branch out specific proxies handlers and behavior whenever the type of proxy is known in the namespace.

<h3>Example</h3>

```js
import { proxyOf, typeOf } from 'js-proxy';

const proxiedValue = proxiedValue => proxiedValue;

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
```
  </div>
</details>

<details id="value-of" open>
  <summary><strong style="font-size:1.5rem">valueOf(unknown)</strong></summary>
  <div markdown=1>

This utility retrieves the value from any proxy type that has been defined.

It's literally a transparent *pass through* operation when proxies have been defined via this library that can be handy whenever the underlying original data is meant to be retrieved.

This utility simply does a `ref.valueOf()` fallback for any other value unknown to the created proxies.

  </div>
</details>
