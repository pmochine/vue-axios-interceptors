import axios, { AxiosError } from 'axios';
// The exports map of axios only has this path with the extension
import settle from 'axios/unsafe/core/settle.js'; // eslint-disable-line import/extensions
import {
    afterEach, describe, expect, it, vi,
} from 'vitest';
import handleResponse, { intercepted } from '../src/index';

// An axios client with the interceptors from the README. The adapter answers
// instead of a server.
const createClient = (adapter) => {
    const client = axios.create({ adapter });

    client.interceptors.response.use(
        (response) => {
            handleResponse(response);
            return response;
        },
        (error) => {
            // Skip the events for one request: axios.get('/user/1', { errorHandle: false })
            if (error.config?.errorHandle === false) {
                return Promise.reject(error);
            }

            handleResponse(error.response);

            return Promise.reject(error);
        },
    );

    return client;
};

// Answers with a status, like a server. axios rejects responses outside 2xx.
const respondWith = (status, data = null) => (config) => new Promise((resolve, reject) => {
    settle(resolve, reject, {
        status, statusText: '', data, headers: {}, config, request: {},
    });
});

describe('with axios', () => {
    afterEach(() => {
        intercepted.$off();
    });

    it('emits events for a successful response', async () => {
        const listener = vi.fn();
        intercepted.$on('response:success', listener);

        await createClient(respondWith(200, { id: 1 })).get('/user/1');

        expect(listener).toHaveBeenCalledWith(expect.objectContaining({ status: 200, code: 'OK', body: { id: 1 } }));
    });

    it('emits events for an error response and rejects with the axios error', async () => {
        const listener = vi.fn();
        intercepted.$on('response:server-error', listener);

        const request = createClient(respondWith(500)).get('/user/1');

        await expect(request).rejects.toBeInstanceOf(AxiosError);
        expect(listener).toHaveBeenCalledWith(expect.objectContaining({ status: 500, code: 'Internal Server Error' }));
    });

    it('emits no events for a request with errorHandle: false', async () => {
        const listener = vi.fn();
        intercepted.$on('response', listener);

        const request = createClient(respondWith(500)).get('/user/1', { errorHandle: false });

        await expect(request).rejects.toBeInstanceOf(AxiosError);
        expect(listener).not.toHaveBeenCalled();
    });

    it('rejects with the network error when no response came back', async () => {
        const listener = vi.fn();
        intercepted.$on('response', listener);
        const client = createClient((config) => Promise.reject(
            new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, {}),
        ));

        const request = client.get('/user/1');

        await expect(request).rejects.toMatchObject({ code: AxiosError.ERR_NETWORK });
        expect(listener).not.toHaveBeenCalled();
    });

    it('rejects with the original error when a request interceptor fails', async () => {
        const client = createClient(respondWith(200));
        const error = new Error('No token');
        client.interceptors.request.use(() => { throw error; });

        await expect(client.get('/user/1')).rejects.toBe(error);
    });
});

describe('handleResponse without a response', () => {
    it.each([undefined, null])('returns false for %s', (response) => {
        expect(handleResponse(response)).toBe(false);
    });
});
