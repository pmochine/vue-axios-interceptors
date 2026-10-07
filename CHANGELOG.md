# Changelog

This file lists the changes since version 2.0.0. Version 1.x (Vue 2) is on the `1x` branch.

## 2.0.0

Version 2.0.0 works without Vue, so it works in a Vue 3 app. Your listeners on `window.intercepted` keep working.

### Upgrade from 1.x

1. Make sure that you use axios 1.x. `axios` `^1.0.0` is now a peer dependency.
2. Version 2.0.0 does not use Vue. If only this package needed `window.Vue`, you can remove it.
3. `window.intercepted` is no longer a Vue instance. It has only `$on`, `$once`, `$off` and `$emit`.
4. Imports of internal files such as `@pmochine/vue-axios-interceptors/src/utility` no longer work. Use the main import.
5. With `require()`, `handleResponse` is the `default` property: `require('@pmochine/vue-axios-interceptors').default`.
6. In the README, the check for `errorHandle` is now `error.config?.errorHandle === false`. For an error without `config`, the old check threw a `TypeError`.

### Changed

- Vue 3 removed `$on`, `$off` and `$once`, so `new Vue()` no longer works as event bus. The [Vue 3 migration guide](https://v3-migration.vuejs.org/breaking-changes/events-api.html) suggests an emitter library instead. The package now has its own small emitter with the method names and the behavior of the Vue 2 instance API. It has no runtime dependency.
- The event bus is also a named export: `import { intercepted } from '@pmochine/vue-axios-interceptors'`.
- Without `window`, for example during server-side rendering, the import no longer logs the error "Require vue-axios-interceptors after you require Vue.".
- As in Vue 2, an error in one listener does not stop the other listeners. The emitter reports the error with `reportError()` in the browser and `console.error()` without it. `Vue.config.errorHandler` and `app.config.errorHandler` no longer get these errors. The same applies to a rejected promise of an async listener.
- A status that is not in the list of status names now sends events, for example 522 from Cloudflare. It sends all events except the name event, and `data.code` is `null`. Before, such a status sent no event.
- The list of status names has 103 Early Hints, 419 Page Expired (Laravel, from [mattias-sanfridsson/vue-axios-interceptors#4](https://github.com/mattias-sanfridsson/vue-axios-interceptors/pull/4)) and 425 Too Early.
- The package ships an ES module and a UMD build in `dist/`, with `"exports"` in `package.json`. The build uses Vite 8. Tests use Vitest. The development tools need Node.js 22.12 or newer. The published files have no Node.js requirement.

### Added

- TypeScript types for `handleResponse`, the event bus, the event data and `window.intercepted`.

### Fixed

- The name events work, for example `response:not-found` or `response:unprocessable-entity`. Since 1.0.0, the package sent `response:undefined` instead.
- On a network error, a timeout or a cancelled request, `error.response` is undefined. `handleResponse(undefined)` threw a `TypeError` inside the interceptor, so the request rejected with that `TypeError` instead of the axios error. Now `handleResponse` returns `false` and sends no event.
- The license file of the original author is back. The 1.x releases did not include it.
