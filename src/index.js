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
        status, code, body: response.data, headers: response.headers,
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

    // Attempt to parse Laravel-structured validation errors.
    try {
        const messages = {};

        Object.keys(response.data.errors).forEach((key) => {
            messages[key] = response.data.errors[key].join(',');
        });

        return messages;
    } catch (e) {
        return response.data;
    }
};

export default handleResponse;
