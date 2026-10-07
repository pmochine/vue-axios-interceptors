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

export default handleResponse;
