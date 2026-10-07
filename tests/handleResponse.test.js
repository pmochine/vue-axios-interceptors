import {
    afterEach, describe, expect, it,
} from 'vitest';
import handleResponse, { intercepted } from '../src/index';

// Records every event that handleResponse emits
const record = (events) => {
    const calls = [];
    events.forEach((event) => intercepted.$on(event, (data) => calls.push([event, data])));
    return calls;
};

describe('handleResponse', () => {
    afterEach(() => {
        intercepted.$off();
    });

    it('emits the general, category, name, status and status class events', () => {
        const calls = record(['response', 'response:client-error', 'response:not-found', 'response:404', 'response:4xx']);
        const headers = { 'content-type': 'application/json' };

        const response = { status: 404, data: { message: 'Missing' }, headers };

        const handled = handleResponse(response);

        const data = {
            status: 404, code: 'Not Found', body: { message: 'Missing' }, headers, response,
        };
        expect(handled).toBe(true);
        expect(calls).toEqual([
            ['response', data],
            ['response:client-error', data],
            ['response:not-found', data],
            ['response:404', data],
            ['response:4xx', data],
        ]);
    });

    it.each([
        [404, 'not-found'],
        [422, 'unprocessable-entity'],
        [418, 'im-a-teapot'],
        [203, 'non-authoritative-information'],
        [414, 'request-uri-too-long'],
    ])('emits the name event of status %i', (status, name) => {
        const calls = record([`response:${name}`, 'response:undefined']);

        handleResponse({ status, data: null, headers: {} });

        expect(calls.map(([event]) => event)).toEqual([`response:${name}`]);
    });

    it.each([
        [101, 'informational'],
        [200, 'success'],
        [304, 'redirection'],
        [422, 'client-error'],
        [503, 'server-error'],
    ])('emits the category of status %i', (status, category) => {
        const calls = record([`response:${category}`, `response:${String(status)[0]}xx`]);

        handleResponse({ status, data: null, headers: {} });

        expect(calls.map(([event]) => event)).toEqual([`response:${category}`, `response:${String(status)[0]}xx`]);
    });

    it.each([
        [419, 'page-expired'],
        [425, 'too-early'],
        [103, 'early-hints'],
    ])('emits the name event of status %i, which 1.x did not know', (status, name) => {
        const calls = record([`response:${name}`]);

        handleResponse({ status, data: null, headers: {} });

        expect(calls.map(([event]) => event)).toEqual([`response:${name}`]);
    });

    it('emits the events for a status without a name, without the name event', () => {
        const calls = [];
        const originalEmit = intercepted.$emit;
        intercepted.$emit = (event, data) => calls.push([event, data]);

        const response = { status: 522, data: 'Timeout', headers: {} };

        try {
            expect(handleResponse(response)).toBe(true);
        } finally {
            intercepted.$emit = originalEmit;
        }

        const data = {
            status: 522, code: null, body: 'Timeout', headers: {}, response,
        };
        expect(calls).toEqual([
            ['response', data],
            ['response:server-error', data],
            ['response:522', data],
            ['response:5xx', data],
        ]);
    });

    it.each([0, 99, 600, 404.5, '404', NaN, undefined])('ignores the status %s', (status) => {
        const calls = record(['response']);

        expect(handleResponse({ status, data: null, headers: {} })).toBe(false);
        expect(calls).toEqual([]);
    });

    it('turns Laravel validation errors of a 422 response into one message per field', () => {
        const calls = record(['response:422']);

        handleResponse({
            status: 422,
            data: {
                message: 'The team name must be a string. (and 1 more error)',
                errors: {
                    team_name: ['The team name must be a string.', 'The team name must be at least 1 characters.'],
                    'users.0.email': ['The users.0.email field is required.'],
                },
            },
            headers: {},
        });

        expect(calls[0][1].body).toEqual({
            team_name: 'The team name must be a string.,The team name must be at least 1 characters.',
            'users.0.email': 'The users.0.email field is required.',
        });
    });

    it('passes the original response, so a listener can read the request and the raw body', () => {
        const calls = record(['response:422']);
        const errors = { email: ['The email field is required.', 'The email must be valid.'] };
        const response = {
            status: 422, data: { errors }, headers: {}, config: { url: '/api/user', method: 'post' },
        };

        handleResponse(response);

        const [[, data]] = calls;
        expect(data.response).toBe(response);
        expect(data.response.config.url).toBe('/api/user');
        expect(data.response.data.errors.email).toEqual(errors.email);
        expect(data.body.email).toBe('The email field is required.,The email must be valid.');
    });

    it('keeps the body of a 422 response without Laravel validation errors', () => {
        const calls = record(['response:422']);
        const data = { error: 'Invalid' };

        handleResponse({ status: 422, data, headers: {} });

        expect(calls[0][1].body).toBe(data);
    });

    it('keeps fields with the names __proto__ and constructor', () => {
        const calls = record(['response:422']);
        const data = JSON.parse('{"errors":{"__proto__":["Required"],"constructor":["Invalid"]}}');

        handleResponse({ status: 422, data, headers: {} });

        const { body } = calls[0][1];
        expect(Object.keys(body)).toEqual(['__proto__', 'constructor']);
        expect(Object.getOwnPropertyDescriptor(body, '__proto__').value).toBe('Required');
        expect(body.constructor).toBe('Invalid');
        expect(Object.getPrototypeOf(body)).toBe(Object.prototype);
    });

    it.each([
        ['false', false],
        ['0', 0],
        ['a string', 'Invalid'],
        ['an array', [['Invalid']]],
        ['a field with a string', { email: 'Invalid' }],
    ])('keeps the body of a 422 response when errors is %s', (name, errors) => {
        const calls = record(['response:422']);
        const data = { message: 'Invalid', errors };

        handleResponse({ status: 422, data, headers: {} });

        expect(calls[0][1].body).toBe(data);
    });

    it('keeps the body of a 422 response when a message cannot be joined', () => {
        const calls = record(['response:422']);
        const data = { errors: { email: [{ toString: null }] } };

        expect(() => handleResponse({ status: 422, data, headers: {} })).not.toThrow();
        expect(calls[0][1].body).toBe(data);
    });

    it('sets the body of an empty 422 response to null', () => {
        const calls = record(['response:422']);

        handleResponse({ status: 422, data: '', headers: {} });

        expect(calls[0][1].body).toBeNull();
    });
});
