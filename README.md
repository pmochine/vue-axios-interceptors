# Vue-axios-interceptors ✋ - handle axios responses globally
[![Latest Version on NPM](https://img.shields.io/npm/v/%40pmochine%2Fvue-axios-interceptors.svg?style=flat-square)](https://npmjs.com/package/%40pmochine%2Fvue-axios-interceptors)
[![Total Downloads on NPM](https://img.shields.io/npm/dt/%40pmochine%2Fvue-axios-interceptors.svg)](https://www.npmjs.com/package/%40pmochine%2Fvue-axios-interceptors)
[![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)](LICENSE)

<p float="left">
  <img src="https://vuejs.org/images/logo.png" width="200" />
  <span style="font-size:22px">+ axios</span>
</p>

**If you are looking for an easy module for catching and handling ajax errors globally, this package is for you. 😜**

The package sends an event for every axios response, for example `response:404` or `response:server-error`. A global component can listen to these events and show the error message.

> **Prerequisites**: axios 1.x for version 2.x of this package. The main import has no Vue dependency. `useIntercepted` from `@pmochine/vue-axios-interceptors/vue` needs Vue 3.2 or newer, or Vue 2.7. Version 1.x needs Vue 2 on `window.Vue` and gets no more updates.

## Installation in 2 Steps

### 1: Install the package 💻 from [npm](https://www.npmjs.com/package/@pmochine/vue-axios-interceptors)

```bash
npm install @pmochine/vue-axios-interceptors axios
```

For the old version with Vue 2, install version 1.x:

```bash
npm install @pmochine/vue-axios-interceptors@^1.0.8
```

### 2: Add the interceptors, for example in `main.js`

```javascript
import axios from 'axios';
import { attachInterceptors } from '@pmochine/vue-axios-interceptors';

attachInterceptors(axios);
```

If you use an axios instance from `axios.create()`, pass that instance. `attachInterceptors` returns a function that removes the interceptors again. A second call for the same instance adds nothing, so every event comes once.

To skip the events of one failed request, set `errorHandle: false` in the request config:

```javascript
axios.get('/user/1', { errorHandle: false });
```

#### Your own interceptors

If you need your own interceptors, for example to report errors to Bugsnag, call `handleResponse` in them:

```javascript
import axios from 'axios';
import handleResponse from '@pmochine/vue-axios-interceptors';

axios.interceptors.response.use(
    (response) => {
        handleResponse(response);
        return response;
    },
    (error) => {
        // bugsnagClient.notify(error); // Add your error handlers here, for example Bugsnag.

        // Skip the events for one request: axios.get('/user/1', { errorHandle: false })
        if (error.config?.errorHandle === false) {
            return Promise.reject(error);
        }

        // On a network error or a timeout, error.response is undefined.
        // Then handleResponse returns false and sends no event.
        handleResponse(error.response);

        return Promise.reject(error);
    },
);
```

## Usage

The package has an event bus called `intercepted`. You can import it. In the browser, it is also on `window.intercepted`, as in version 1.x. The event bus has the event methods of a Vue 2 instance: `$on`, `$once`, `$off` and `$emit`.

```javascript
import { intercepted } from '@pmochine/vue-axios-interceptors';

intercepted.$on('response', (data) => {
    console.log(data); // { status: 404, code: 'Not Found', body: { ... }, headers: { ... }, response: { ... } }

    // Show the message.
});
```

You can also listen for a status code or a category, for example to handle 4xx responses differently than 5xx responses:

```javascript
// All responses.
intercepted.$on('response', (data) => {
    // data = { status: 404, code: 'Not Found', body: { ... }, headers: { ... }, response: { ... } }
});

// All responses in the client error category (4xx).
// The categories are 'informational', 'success', 'redirection', 'client-error' and 'server-error'.
intercepted.$on('response:client-error', (data) => {});

// All responses with a status from 500 to 599.
intercepted.$on('response:5xx', (data) => {});

// One status.
intercepted.$on('response:404', (data) => {});

// The name of one status, in lowercase with dashes.
intercepted.$on('response:unprocessable-entity', (data) => {});
```

Every response sends these events, in this order: `response`, `response:<category>`, `response:<name>`, `response:<status>` and `response:<first digit>xx`.

The names come from the [list of status names](https://github.com/pmochine/vue-axios-interceptors/blob/master/src/statuscodes.js) of this package, for example `not-found`, `too-many-requests` or `page-expired` (419, Laravel). Some names are older than the current names on [MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status). For example, 422 sends `response:unprocessable-entity`, not `response:unprocessable-content`. The names do not change, so listeners from 1.x keep working.

A status that is not in the list, for example 522 from Cloudflare, sends all events except the name event. Then `data.code` is `null`. handleResponse ignores a status that is not an integer from 100 to 599.

### The original response

`data.response` is the response that handleResponse got, for example the axios response. Use it to find the request, for example to skip a 401 from the login check:

```javascript
intercepted.$on('response:401', (data) => {
    if (data.response.config.url === '/api/user') {
        return;
    }

    router.push('/login');
});
```

`data.response.data` is the body before the package parses Laravel validation errors.

### Requests without a response

On a network error or a timeout, no response comes back, so there is no `response` event. With `attachInterceptors`, such a request sends the event `no-response` instead:

```javascript
intercepted.$on('no-response', (data) => {
    console.log(data.code); // 'ERR_NETWORK' or 'ECONNABORTED' (timeout)
    console.log(data.error.config.url); // the request

    // Show "Please check your connection".
});
```

A cancelled request, for example with an `AbortController`, sends no event. A request that did not go out, for example because a request interceptor threw an error, also sends no event. If you use your own interceptors, `no-response` is not sent.

### In a Vue component

`useIntercepted` adds a listener. When the component unmounts, it removes the listener. Without that, the listener stays on the event bus after the component is gone.

```vue
<script setup>
import { ref } from 'vue';
import { useIntercepted } from '@pmochine/vue-axios-interceptors/vue';

const message = ref('');

useIntercepted('response:client-error', (data) => {
    message.value = `${data.status} ${data.code}`;
});

useIntercepted('no-response', () => {
    message.value = 'Please check your connection.';
});
</script>

<template>
    <p v-if="message">{{ message }}</p>
</template>
```

`useIntercepted` takes the same events and listeners as `intercepted.$on`, also an array of events. It returns a function that removes the listener earlier. `intercepted.$off(event, listener)` does not remove it, because `useIntercepted` registers a function of its own. Outside of a component, for example in a store, the listener stays until the effect scope stops or until you call that function. On the server, it adds no listener, because the server does not unmount components.

`useIntercepted` works with Vue 3.2 or newer and with Vue 2.7. Vue is an optional peer dependency: you only need it for this import.

Without `useIntercepted`, add the listener in `onMounted` and remove it in `onBeforeUnmount`:

```javascript
onMounted(() => intercepted.$on('response:client-error', showError));
onBeforeUnmount(() => intercepted.$off('response:client-error', showError));
```

### Using this package with Laravel

Laravel answers with `422` for a validation error. The package parses the [Laravel validation errors](https://laravel.com/docs/validation#validation-error-response-format) into an object with one string per field, on `data.body`. If a field has more than one message, the messages are joined with a comma.

```javascript
intercepted.$on('response:422', (data) => {
    console.log(data.body); // { email: 'The email field is required.' }
});
```

If the body of a 422 response has no Laravel validation errors, `data.body` is the original body. If the body of a 422 response is empty, `data.body` is `null`.

For an expired CSRF token, Laravel answers with `419`. Listen for `response:419` or `response:page-expired`, for example to reload the page.

### TypeScript

The package includes types. The listener of a response event gets the type `InterceptedResponse`. You can give the body a type:

```typescript
import { intercepted } from '@pmochine/vue-axios-interceptors';

intercepted.$on<Record<string, string>>('response:422', (data) => {
    const message = data.body.email;
});
```

axios does not know the `errorHandle` option. To use it with TypeScript, add it to the axios types in your project:

```typescript
// For example in src/axios.d.ts. The import makes the file extend the axios types.
import 'axios';

declare module 'axios' {
    interface AxiosRequestConfig {
        errorHandle?: boolean;
    }
}
```

### Server-side rendering

Without `window`, for example in Nuxt on the server, the package does not set `window.intercepted`. Import `intercepted` instead. The event bus is shared by all requests on the server, so add listeners only in the browser. `useIntercepted` does that for you. Without it, add listeners in `onMounted`.

## Upgrade from 1.x

1. Make sure that you use axios 1.x. Version 2.x declares `axios` `^1.0.0` as a peer dependency.
2. Version 2.x does not use Vue. If only this package needed `window.Vue = require('vue')`, you can remove that line.
3. Your listeners on `window.intercepted` keep working. `window.intercepted` is no longer a Vue instance, so only `$on`, `$once`, `$off` and `$emit` are available.
4. Replace your interceptors with `attachInterceptors(axios)` from step 2. If you keep your own interceptors and check `error.config.hasOwnProperty('errorHandle')`, use `error.config?.errorHandle === false`. For an error without `config`, the old check throws a `TypeError`.

Other changes in version 2.x:

- The name events work now, for example `response:not-found`. Version 1.0.x sent `response:undefined` instead.
- A status that is not in the list sends events. Before, it sent no event.
- `handleResponse(undefined)` returns `false`. Before, it threw a `TypeError`, so a request without a response rejected with that `TypeError` instead of the axios error.
- The status must be a number. Version 1.x also accepted a string such as `'404'`. axios always sends a number. If your own code calls `handleResponse` with a string, convert it with `Number()`.
- A 422 body with Laravel validation errors keeps a field named `__proto__`. If `errors` is not an object with an array per field, `data.body` is the original body. Before, for example `errors: false` gave an empty object.
- Imports of internal files such as `@pmochine/vue-axios-interceptors/src/utility` no longer work. Use the main import.
- All copies of version 2.x in one app share one event bus, for example an ES module copy and a CommonJS copy.

The [CHANGELOG](CHANGELOG.md) lists all changes.

### Coming from `vue-axios-interceptors` without scope

The original package [`vue-axios-interceptors`](https://www.npmjs.com/package/vue-axios-interceptors) needs Vue 2. Its import added the interceptors to `window.axios`. With this package, call `attachInterceptors(axios)` once instead. Your listeners on `window.intercepted` keep working.

```javascript
// Before
window.Vue = require('vue');
window.axios = require('axios');
require('vue-axios-interceptors');

// After
import axios from 'axios';
import { attachInterceptors } from '@pmochine/vue-axios-interceptors';

attachInterceptors(axios);
```

## Development

You need Node.js 22.13 or a newer 22.x, Node.js 24, or Node.js 26 or newer. These are the versions that Vitest 5 and ESLint 10 support. The file `.nvmrc` sets Node.js 24.

```bash
npm install
npm test          # unit tests and type checks
npm run lint
npm run build     # builds dist/
```

`npm pack` and `npm publish` build `dist/` first.

### Releases

1. Set the new version in `package.json` and add it to `CHANGELOG.md`.
2. Merge the change into `master`.
3. Push a tag with the version number, for example `git tag 2.0.1 && git push origin 2.0.1`.

The `Release` workflow then runs the lint and the tests, and publishes the package to npm. It uses npm trusted publishing, so it needs no npm token and no 2FA prompt. The tag must match the version in `package.json` and must be on `master`. Run the workflow by hand to check the setup. That run publishes nothing.

On npmjs.com, the trusted publisher of the package points to this repository, the workflow `release.yml` and the environment `npm-publish`. Under "Allowed actions", it must allow `npm publish`. If a new trusted publisher does not publish within 2 days, it expires. So create it right before a release.

## Security

If you discover any security related issues, please don't email me. I'm afraid 😱. avidofood@protonmail.com

## Credits

Now comes the best part! 😍

 - Idea found on https://github.com/mattias-persson/vue-axios-interceptors

Oh come on. You read everything?? If you liked it so far, hit the ⭐️ button to give me a 🤩 face.
