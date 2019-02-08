try {
    window.intercepted = new Vue();
} catch (e) {
    console.error('Require vue-axios-interceptors after you require Vue.'); //eslint-disable-line
}

import { slugify, statusCodes } from './src/utility';


const handleResponse = (response) => {
    const categories = ['informational', 'success', 'redirection', 'client-error', 'server-error'];
    const { status } = response;
    const codes = statusCodes();

    if (!codes[status]) {
        return false;
    }

    const statusCategory = parseInt(status.toString().charAt(0), 10);
    const category = categories[statusCategory - 1];
    const sluggedCode = slugify(codes[status]);
    const data = { status, code: codes[status], body: response.data, headers: response.headers };

    // Parse the validation errors.
    if (parseInt(status, 10) === 422) {
        data.body = handleValidationErrors(response);
    }

    window.intercepted.$emit('response', data);
    window.intercepted.$emit(`response:${category}`, data);
    window.intercepted.$emit(`response:${sluggedCode}`, data);
    window.intercepted.$emit(`response:${status}`, data);
    window.intercepted.$emit(`response:${statusCategory}xx`, data);

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
