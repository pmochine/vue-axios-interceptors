import createEmitter from './emitter';
import { slugify, statusCodes } from './utility';

// One event bus for all copies of the package, for example an ES module and a CommonJS copy,
// or two bundles on one page. The key has the major version, because the event bus of
// another major version can work differently.
const busKey = Symbol.for('@pmochine/vue-axios-interceptors@2');
if (!globalThis[busKey]) {
    globalThis[busKey] = createEmitter();
}

export const intercepted = globalThis[busKey];

// Version 1.x put the event bus on window. Listeners written for 1.x keep working.
if (typeof window !== 'undefined') {
    window.intercepted = intercepted;
}

const isStatus = (status) => Number.isInteger(status) && status >= 100 && status <= 599;

const handleResponse = (response) => {
    const categories = ['informational', 'success', 'redirection', 'client-error', 'server-error'];

    // A network error, a timeout or a cancelled request has no response
    if (!response || !isStatus(response.status)) {
        return false;
    }

    const { status } = response;
    const code = statusCodes()[status] || null;
    const statusCategory = Math.floor(status / 100);
    const category = categories[statusCategory - 1];
    const data = {
        status, code, body: response.data, headers: response.headers, response,
    };

    // Parse the validation errors.
    if (status === 422) {
        data.body = handleValidationErrors(response);
    }

    intercepted.$emit('response', data);
    intercepted.$emit(`response:${category}`, data);
    // A status without a name in the list, for example 522 from Cloudflare, has no name event
    if (code) {
        intercepted.$emit(`response:${slugify(code)}`, data);
    }
    intercepted.$emit(`response:${status}`, data);
    intercepted.$emit(`response:${statusCategory}xx`, data);

    return true;
};

const handleValidationErrors = (response) => {
    if (!response.data) {
        return null;
    }

    // Laravel validation errors: { message, errors: { field: ['message', ...] } }
    const { errors } = response.data;
    const isFieldMap = errors !== null && typeof errors === 'object' && !Array.isArray(errors)
        && Object.values(errors).every(Array.isArray);

    if (!isFieldMap) {
        return response.data;
    }

    // Object.fromEntries keeps a field named __proto__ as a normal field.
    // join() throws for a message that has no string value. Then the body stays as it is,
    // because an error here would replace the axios error in the interceptor.
    try {
        return Object.fromEntries(
            Object.entries(errors).map(([field, messages]) => [field, messages.join(',')]),
        );
    } catch (e) {
        return response.data;
    }
};

// The axios instances with the interceptors of this package and their detach functions.
// Shared like the event bus, so a second call from any copy does not add them twice.
const attachedKey = Symbol.for('@pmochine/vue-axios-interceptors@2/attached');
if (!globalThis[attachedKey]) {
    globalThis[attachedKey] = new WeakMap();
}
const attached = globalThis[attachedKey];

// The same check as axios.isCancel(). A cancelled request is no error to show.
const isCancel = (error) => Boolean(error.__CANCEL__); // eslint-disable-line no-underscore-dangle

export const attachInterceptors = (instance) => {
    if (attached.has(instance)) {
        return attached.get(instance);
    }

    const id = instance.interceptors.response.use(
        (response) => {
            handleResponse(response);
            return response;
        },
        (error) => {
            // Skip the events for one request: axios.get('/user/1', { errorHandle: false })
            if (error && error.config && error.config.errorHandle === false) {
                return Promise.reject(error);
            }

            if (error && error.response) {
                handleResponse(error.response);
            } else if (error && error.request && !isCancel(error)) {
                // The request went out, but no response came back: a network error or a timeout
                intercepted.$emit('no-response', { code: error.code || null, error });
            }

            return Promise.reject(error);
        },
    );

    const detach = () => {
        if (attached.get(instance) === detach) {
            instance.interceptors.response.eject(id);
            attached.delete(instance);
        }
    };
    attached.set(instance, detach);

    return detach;
};

export default handleResponse;
