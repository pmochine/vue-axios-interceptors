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

    it('emits the general, category, status and status class events', () => {
        const calls = record(['response', 'response:client-error', 'response:404', 'response:4xx']);
        const headers = { 'content-type': 'application/json' };

        const handled = handleResponse({ status: 404, data: { message: 'Missing' }, headers });

        const data = {
            status: 404, code: 'Not Found', body: { message: 'Missing' }, headers,
        };
        expect(handled).toBe(true);
        expect(calls).toEqual([
            ['response', data],
            ['response:client-error', data],
            ['response:404', data],
            ['response:4xx', data],
        ]);
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

    it('keeps the body of a 422 response without Laravel validation errors', () => {
        const calls = record(['response:422']);
        const data = { error: 'Invalid' };

        handleResponse({ status: 422, data, headers: {} });

        expect(calls[0][1].body).toBe(data);
    });

    it('sets the body of an empty 422 response to null', () => {
        const calls = record(['response:422']);

        handleResponse({ status: 422, data: '', headers: {} });

        expect(calls[0][1].body).toBeNull();
    });
});
