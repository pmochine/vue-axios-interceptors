import createEmitter from './emitter';
import { slugify, statusCodes } from './utility';

export const intercepted = createEmitter();

// Version 1.x put the event bus on window. Listeners written for 1.x keep working.
if (typeof window !== 'undefined') {
    window.intercepted = intercepted;
}

const handleResponse = (response) => {
    const categories = ['informational', 'success', 'redirection', 'client-error', 'server-error'];
    const codes = statusCodes();

    // A network error, a timeout or a cancelled request has no response
    if (!response || !codes[response.status]) {
        return false;
    }

    const { status } = response;

    const statusCategory = parseInt(status.toString().charAt(0), 10);
    const category = categories[statusCategory - 1];
    const sluggedCode = slugify(codes[status]);
    const data = {
        status, code: codes[status], body: response.data, headers: response.headers,
    };

    // Parse the validation errors.
    if (parseInt(status, 10) === 422) {
        data.body = handleValidationErrors(response);
    }

    intercepted.$emit('response', data);
    intercepted.$emit(`response:${category}`, data);
    intercepted.$emit(`response:${sluggedCode}`, data);
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
