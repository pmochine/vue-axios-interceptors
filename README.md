
# vue-axios-interceptors
Catch and handle ajax errors globally when using `Axios` with `Vue`.

### Installation
```bash
npm i @pmochine/vue-axios-interceptors
```

```javascript
// Make sure you import this package after you've imported Vue:
window.Vue = require('vue');

// Make sure the axios package is available globally on the window object:
window.axios = require('axios');

import handleResponse from '@pmochine/vue-axios-interceptors';

window.axios.interceptors.response.use(
    response => {
      handleResponse(response);
      return response;
    },
    error => {
      //bugsnagClient.notify(error); //add your error handlers like bugsnag etc.

      // you can deactivate the handleResponse with for example: axios.get('/user/1', {errorHandle: false})
      if( error.config.hasOwnProperty('errorHandle') && error.config.errorHandle === false ) {
          return Promise.reject(error);
      }

      handleResponse(error.response);
      
      return Promise.reject(error);
    },
);
```

### Usage
The package registers a new global event bus called `intercepted` on the `window` object and emits several events on it when an ajax call leads to an error. You can easily listen for these events to build a smooth error handling workflow, for example in a global component responsible for displaying error messages:

```javascript
// for example in your errorListener.js

  window.intercepted.$on('response', data => {
      console.log(data); // { status: 404, code: 'Not found', body: null, headers: null }
        
      // Display the message.
  });

```

You can also listen for specific status codes and response categories, for example if you'd like to handle 4xx responses differently than 5xx responses:
```javascript
// Listen for any intercepted responses.
window.intercepted.$on('response', data => {
  // data = { status: 404, code: 'Not found', body: null, headers: null }
});

// Listen for any intercepted responses under the Client Error category (4xx).
window.intercepted.$on('response:client-error', data => {
  //categories are: 'informational', 'success', 'redirection', 'client-error', 'server-error'
});

// Listen for any intercepted responses under the Server Error category (5xx).
window.intercepted.$on('response:5xx', data => {
  // 
});

// Listen for a specific status.
window.intercepted.$on('response:404', data => {
  // 
});

// Listen for a specific HTTP code. (rememeber lowercase and no space)
window.intercepted.$on('response:unprocessable-entity', data => {
  // 
});
```

For a complete list of status codes, visit https://httpstatuses.com/. (You can finde the specific code-names.)

### Using this package with Laravel
If you're using Laravel >=5.5 as your backend, you're in luck. If your server returns a `422` response (typically a validation error), the package will automatically parse the returned failures into an iteratable key-value object which you can access on `data.body`. This is way simpler to use in order to display all messages or reference a single field error than with the original error message structure.