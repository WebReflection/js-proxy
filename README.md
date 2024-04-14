[![build status](https://github.com/WebReflection/js-proxy/actions/workflows/node.js.yml/badge.svg)](https://github.com/WebReflection/js-proxy/actions) [![Coverage Status](https://coveralls.io/repos/github/WebReflection/js-proxy/badge.svg?branch=main)](https://coveralls.io/github/WebReflection/js-proxy?branch=main)

<sup>**Social Media Photo by [Vinu T](https://unsplash.com/@happy_pixel?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash) on [Unsplash](https://unsplash.com/photos/a-small-waterfall-in-the-middle-of-a-forest-DHo1nNUI0y4?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash)**</sup>

The "*one-stop shop*" solution for JS Proxies and FFI APIs.

**[Documentation](https://webreflection.github.io/js-proxy/)**

- - -

### Table of content

  * **[API](#api)** that describes the default exported utility
  * **[jsProxy](#jsproxy)** that describes the namespace returned by the utility
  * **[MITM](#mitm)** that describes what `js-proxy/mitm` exports as extra utility
  * **[Heap](#heap)** that describes what `js-proxy/heap` exports as extra utility
  * **[Traps](#traps)** that describes what `js-proxy/traps` exports
  * **[Types](#types)** that describes what `js-proxy/types` exports

## API

### `define(namespace):jsProxy`

The default export provides an utility to define various handlers for any kind of proxied value and returns a [jsProxy](#jsproxy) object literal.

Each handler can have zero, one or more [proxy traps](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy#handler_functions) *plus* the following extra handlers:

  * **destruct** which, if present, will orchestrate automatically a [FinalizationRegistry](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry) logic to invoke such trap once its proxied value is not used anymore in the wild.
  * **valueOf** which, if present, allows the `valueOf(proxy)` utility to retrieve directly the underlying proxied value.

> [!Important]
> 
> If the namespace contains `object`, `array`, or `function` as own entries the value can be either a reference to those types or actually a number or any other primitive which goal is to reflect proxies across worlds (boundaries, workers, realms, interpreters).
> 
> In case those references are primitives it is mandatory to define all native traps otherwise the `Reflect` methods would fail at dealing with numbers, strings, or any other kind of primitive.
> 
> Any other name will simply directly accept references, but not primitives, still providing the special methods that are indeed available to every type of proxy.

#### Example

```js
import define from 'js-proxy';

// simply returns whatever value is received
const identity = value => value;

// te jsProxy is an object with these fields / utilities:
const { proxy, release, typeOf, valueOf } = define({
  object: { valueOf: identity },
  array: { valueOf: identity },
  function: { valueOf: identity },
  direct: {
    destruct(ref) {
      console.log('this reference is no longer needed', ref);
    }
  },
});

// object, array and function always act
// like proxies and values for objects, arrays or functions
// any other namespace entry uses directly the referenced value.
const object = proxy.object([]);  // still an object
const array = proxy.array({});    // still an array
const fn = proxy.function(123);   // still a function

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

The reason for `object`, `array`, and `function` to have a special treatment is the fact both `typeof` and `Array.isArray` can actually drill into the proxied type so that this module guarantees that if you meant to proxy an *array* or a *function*, these will reflect their entity across introspection related operations, also providing a way to simply proxy memory addresses or any other kind of identity, and deal with [Foreign Function Interfaces](https://en.wikipedia.org/wiki/Foreign_function_interface) for non *JS* related programming languages.


## jsProxy

### `jsProxy.proxy.type(value, ...rest)`

The `proxy` literal will contain all defined proxy types able to bootstrap related proxies directly.

The definition can contain any valid object literal key, including symbols.

<h4>Example</h4>

```js
import define from 'js-proxy';

const secret = Symbol('secret');

const { proxy } = define({
  object: {
    // ... one or more traps ...
  },
  custom: {
    // ... one or more traps ...
  },
  [secret]: {
    // ... one or more traps ...
  },
});

// create 3 different proxies
proxy.object({});   // typeOf(...) === "object"
proxy.custom({});   // typeOf(...) === "custom"
proxy[secret]({});  // typeOf(...) === secret
```

#### Dealing with primitives

The `proxy` namespace is able to bootstrap even primitives but with the following constraints:

  * at least common traps must be well defined otherwise the *Reflect* fallback might fail
  * if passed as primitive, the value will be proxied automatically as an `Object(primitive)` and there won't be any way to `release(primitive)` later on
  * if passed as reference, it's still needed to define common traps

#### Example

```js
import define from 'js-proxy';

const { proxy, release } = define({
  string: {
    get(str, key) {
      const value = str[key];
      return typeof value === 'function' ?
              value.bind(str) : value;
    },
    destruct(str) {
      console.log(`wrap for ${str} released`);
    },
  },
});

// works but release won't be effective
proxy.string('test').slice(0, 1); // "t"
release('test'); // ⚠️ WRONG
// throws: Invalid unregisterToken ('test')

// this works better and it's possible to release
const wrap = Object('test'); // new String('test')
proxy.string(wrap).slice(0, 1);
release(wrap);  // 👍 OK
// destruct trap won't ever be invoked
```

#### Dealing with foreign programming languages

Usually most primitive types are exchanged as such in the *ForeignPL* to *JS* world, so that numbers are converted, boolean are converted, strings are (likely) converted (but they don't really need to be) but objects, arrays, and functions cannot really be converted retaining their reference in the *ForeignPL* counterpart.

If it's desired to both deal with these cases and have a way to `release(token)` later on, there are at least two different approaches:

  * wrap that primitive identifier as object itself such as `{_ref: 123}`, requiring for each trap to extract that `_ref` each time
  * retain the token a part, passing it as second proxy argument

It is really up to you how you prefer handling references to your current *foreign PL* but at least there are a couple of options.

#### Example

```js
import define from 'js-proxy';

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
setTimeout(release, 1000, trapped1);

// case No.2
const trapped2 = 456;
const token2 = Object(456);
let proxied2 = proxy.object(trapped2, token2);
setTimeout(release, 1000, token2);
```

### `jsProxy.release(token)`

This utility is particularly handy for *FFI* related use cases or whenever an explicit `destroy()` or `destruct()` method is meant by the code that provides the proxy.

When the token is known and released, the `destruct` trap won't happen again, effectively avoiding double invokes of potentially the same procedure.

The `token` reference is, by default, the same proxied object so that it's easy behind the scene to hold it internally and eventually procedurally release that reference from the garbage collector.

Use cases could be a terminated worker that was holding delivered proxies or users defined explicit actions to signal some reference is not needed anymore and won't be accessed again.

#### Example

```js
import define from 'js-proxy';

const { proxy, release } = define({
  direct: {
    destruct(ref) {
      console.log(ref, 'not used anymore');
    }
  }
});

const myRef = {ref: 123};
const outProxy = proxy.direct(myRef);

// any time later we want to drop myRef on GC
release(myRef);
```

### `jsProxy.typeOf(unknown)`

Differently from the [typeof operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof), the `typeOf` utility does the following:

  * it retrieves the current `typeof` of the generic, *unknown*, value
  * if the resulting *type* is `"object"`:
    * if the namespace had such type defined in it, it returns that brand name instead
    * if the value is an *array*, it returns `"array"`
    * if the value is `null`, it returns `"null"`
  * otherwise returns the string that `typeof` originally returned

> [!Note]
> 
> This utility is not necessarily that useful with this module but it's especially handy to branch out specific proxies handlers and behavior whenever the type of proxy is known in the namespace.

#### Example

```js
import define from 'js-proxy';

const { proxy, typeOf } = define({
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


### `jsProxy.valueOf(unknown)`

If a defined proxy handler has its own `valueOf` trap, this utility will call that trap directly and return whatever that method decided to return.

It's literally a transparent *pass through* operation that will not involve native traps.

If the handler did not provide its own `valueOf` trap, this utility simply perform a `ref.valueOf()` operation.

#### Example

```js
import define from 'js-proxy';

const identity = value => value;

const { proxy, valueOf } = define({
  object: {
    valueOf: identity,
  },
  direct: {
    valueOf: identity,
  },
  unknown: {},
});

const object = proxy.object(123);
const array = [1, 2, 3];
const direct = proxy.direct(array);
const unknown = proxy.unknown([4, 5, 6]);

// all true
valueOf(object) === 123;
valueOf(direct) === array;
valueOf(unknown) === unknown;
```


## MITM

The [MITM](https://en.wikipedia.org/wiki/Man-in-the-middle_attack) utility puts a proxy handler behind the reference and not upfront. Usually, proxies are transparent until they are not:

  * DOM operations are not allowed with proxies
  * `typeof` or `isArray` or anything else drilling the proxied type might reveal the proxy or fail
  * references need to be proxied before others can consume these, as opposite of hooking any extra feature/utility/observability without requiring 3rd party to change their reference to the real target

Accordingly, the *MITM* export allows anything to have a proxy between its reference and its prototype, which requires extra careful handling, but it can be summarized as such:

```js
import mitm from 'js-proxy/mitm';

// generic DOM handler for text property
const textHandler = {
  get(__proto__, name, target) {
    if (name === 'text')
      return target.textContent;
    return Reflect.get(__proto__, name, target);
  },
  set(__proto__, name, value, target) {
    if (name === 'text') {
      target.textContent = value;
      return true;
    }
    return Reflect.set(__proto__, name, value, target);
  }
};

// pollute (once) any DOM node
mitm(document.body, textHandler);

// see magic
document.body.text = 'Hello MITM';
document.body.text; // 'Hello MITM'
```

The rule of thumb for *MITM* is that last come is the first to intercept but it's possible to add multiple *MITM* although performance will degrade proportionally as more logic will be involved per each property.


## Heap

As extra utility, the `js-proxy/heap` exports is particularly useful for cross realm *JS* proxied interactions.

As example, if your worker, or your main, would like to expose a reference to another worker or main thread, it is possible to associate the current reference to a unique identifier that can then be destroyed once the other world won't need it anymore.

#### Example

```js
import { drop, get, hold } from 'js-proxy/heap';

let thisWorldReference = {};

// traps forever the reference until drop
let refID = hold(thisWorldReference);
// it's always unique by reference
// hold(thisWorldReference) === hold(thisWorldReference)

postMessage({ type: 'object', value: refID });

addEventListener('message', ({ data }) => {
  const { value, trap, args } = data;
  // drop the reference, not needed out there anymore
  if (trap === 'destruct') {
    drop(value);
  }
  else {
    // retrieve the original reference by id
    const ref = get(value);
    postMessage(Reflect[trap](ref, ...args));
  }
});
```

In the outer world, the `proxy.object({_ref: value})` could forward back via `postMessage` all traps, including the `destruct` when it happens, so that the worker can apply and reply with the result.

As summary, this export helps relating any reference to a unique identifier and it holds such reference until it's dropped. This is particularly useful to avoid the current realm collecting that reference, as it might be used solely in the outer world, still enabling, via `destruct` ability, to free memory on occasion.


## Traps

The `js-proxy/traps` exports the following:

```js
// Standard Proxy Traps
export const APPLY                        = 'apply';
export const CONSTRUCT                    = 'construct';
export const DEFINE_PROPERTY              = 'defineProperty';
export const DELETE_PROPERTY              = 'deleteProperty';
export const GET                          = 'get';
export const GET_OWN_PROPERTY_DESCRIPTOR  = 'getOwnPropertyDescriptor';
export const GET_PROTOTYPE_OF             = 'getPrototypeOf';
export const HAS                          = 'has';
export const IS_EXTENSIBLE                = 'isExtensible';
export const OWN_KEYS                     = 'ownKeys';
export const PREVENT_EXTENSION            = 'preventExtensions';
export const SET                          = 'set';
export const SET_PROTOTYPE_OF             = 'setPrototypeOf';

// Custom (JS)Proxy Traps
export const DESTRUCT                     = 'destruct';
export const VALUE_OF                     = 'valueOf';
```


## Types

The `js-proxy/types` exports the following:

```js
export const ARRAY     = 'array';
export const BIGINT    = 'bigint';
export const BOOLEAN   = 'boolean';
export const FUNCTION  = 'function';
export const NULL      = 'null';
export const NUMBER    = 'number';
export const OBJECT    = 'object';
export const STRING    = 'string';
export const SYMBOL    = 'symbol';
export const UNDEFINED = 'undefined';
```
