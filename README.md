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

> **Prerequisites**: axios 1.x for version 2.x of this package. Version 2.x has no Vue dependency, so it works in a Vue 3 app. Version 1.x needs Vue 2 on `window.Vue` and gets no more updates.

## Installation in 2 Steps

### 1: Install the package 💻 from [npm](https://www.npmjs.com/package/@pmochine/vue-axios-interceptors)

```bash
npm install @pmochine/vue-axios-interceptors axios
```

For the old version with Vue 2, install version 1.x:

```bash
npm install @pmochine/vue-axios-interceptors@^1.0.8
```

### 2: Add the interceptors, for example in `errorHandler.js`

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

If you use an axios instance from `axios.create()`, add the interceptors to that instance.

## Usage

The package has an event bus called `intercepted`. You can import it. In the browser, it is also on `window.intercepted`, as in version 1.x. The event bus has the event methods of a Vue 2 instance: `$on`, `$once`, `$off` and `$emit`.

```javascript
import { intercepted } from '@pmochine/vue-axios-interceptors';

intercepted.$on('response', (data) => {
    console.log(data); // { status: 404, code: 'Not Found', body: { ... }, headers: { ... } }

    // Show the message.
});
```

You can also listen for a status code or a category, for example to handle 4xx responses differently than 5xx responses:

```javascript
// All responses.
intercepted.$on('response', (data) => {
    // data = { status: 404, code: 'Not Found', body: { ... }, headers: { ... } }
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

The names come from the list of [HTTP status codes on MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status), for example `not-found`, `too-many-requests` or `page-expired` (419, Laravel). A status that is not in the list, for example 522 from Cloudflare, sends all events except the name event. Then `data.code` is `null`.

### In a Vue 3 component

Add the listener in `onMounted` and remove it in `onBeforeUnmount`. Otherwise, the listener stays on the event bus after the component is gone.

```vue
<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { intercepted } from '@pmochine/vue-axios-interceptors';

const message = ref('');

const showError = (data) => {
    message.value = `${data.status} ${data.code}`;
};

onMounted(() => intercepted.$on('response:client-error', showError));
onBeforeUnmount(() => intercepted.$off('response:client-error', showError));
</script>

<template>
    <p v-if="message">{{ message }}</p>
</template>
```

### Using this package with Laravel

Laravel answers with `422` for a validation error. The package parses the [Laravel validation errors](https://laravel.com/docs/validation#validation-error-response-format) into an object with one string per field, on `data.body`. If a field has more than one message, the messages are joined with a comma.

```javascript
intercepted.$on('response:422', (data) => {
    console.log(data.body); // { email: 'The email field is required.' }
});
```

If the body of a 422 response has no Laravel validation errors, `data.body` is the original body.

For an expired CSRF token, Laravel answers with `419`. Listen for `response:419` or `response:page-expired`, for example to reload the page.

### TypeScript

The package includes types. The listener of a response event gets the type `InterceptedResponse`. You can give the body a type:

```typescript
import { intercepted } from '@pmochine/vue-axios-interceptors';

intercepted.$on<Record<string, string>>('response:422', (data) => {
    const message = data.body.email;
});
```

axios does not know the `errorHandle` option from step 2. To use it with TypeScript, add it to the axios types in your project:

```typescript
declare module 'axios' {
    interface AxiosRequestConfig {
        errorHandle?: boolean;
    }
}
```

### Server-side rendering

Without `window`, for example in Nuxt on the server, the package does not set `window.intercepted`. Import `intercepted` instead. The event bus is shared by all requests on the server, so add listeners only in the browser, for example in `onMounted`.

## Upgrade from 1.x

1. Make sure that you use axios 1.x. Version 2.x declares `axios` `^1.0.0` as a peer dependency.
2. Version 2.x does not use Vue. If only this package needed `window.Vue = require('vue')`, you can remove that line.
3. Your listeners on `window.intercepted` keep working. `window.intercepted` is no longer a Vue instance, so only `$on`, `$once`, `$off` and `$emit` are available.
4. If your error handler checks `error.config.hasOwnProperty('errorHandle')`, use `error.config?.errorHandle === false` from step 2. For an error without `config`, the old check throws a `TypeError`.

Other changes in version 2.x:

- The name events work now, for example `response:not-found`. Version 1.0.x sent `response:undefined` instead.
- A status that is not in the list sends events. Before, it sent no event.
- `handleResponse(undefined)` returns `false`. Before, it threw a `TypeError`, so a request without a response rejected with that `TypeError` instead of the axios error.
- Imports of internal files such as `@pmochine/vue-axios-interceptors/src/utility` no longer work. Use the main import.

The [CHANGELOG](CHANGELOG.md) lists all changes.

## Security

If you discover any security related issues, please don't email me. I'm afraid 😱. avidofood@protonmail.com

## Credits

Now comes the best part! 😍

 - Idea found on https://github.com/mattias-persson/vue-axios-interceptors

Oh come on. You read everything?? If you liked it so far, hit the ⭐️ button to give me a 🤩 face.
