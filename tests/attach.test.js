import axios, { AxiosError } from 'axios';
// The exports map of axios only has this path with the extension
import settle from 'axios/unsafe/core/settle.js'; // eslint-disable-line import/extensions
import {
    afterEach, describe, expect, it, vi,
} from 'vitest';
import { attachInterceptors, intercepted } from '../src/index';

// Answers with a status, like a server. axios rejects responses outside 2xx.
const respondWith = (status, data = null) => (config) => new Promise((resolve, reject) => {
    settle(resolve, reject, {
        status, statusText: '', data, headers: {}, config, request: {},
    });
});

describe('attachInterceptors', () => {
    afterEach(() => {
        intercepted.$off();
    });

    it('emits the events for a successful and a failed response', async () => {
        const client = axios.create({ adapter: (config) => respondWith(config.url === '/ok' ? 200 : 404)(config) });
        const listener = vi.fn();
        intercepted.$on('response', listener);
        attachInterceptors(client);

        await client.get('/ok');
        const failed = client.get('/missing');

        await expect(failed).rejects.toBeInstanceOf(AxiosError);
        expect(listener.mock.calls.map(([data]) => data.status)).toEqual([200, 404]);
    });

    it('returns the response and rejects with the axios error', async () => {
        const client = axios.create({ adapter: respondWith(200, { id: 1 }) });
        attachInterceptors(client);

        const response = await client.get('/user/1');

        expect(response.data).toEqual({ id: 1 });
    });

    it('stops the events after detach', async () => {
        const client = axios.create({ adapter: respondWith(500) });
        const listener = vi.fn();
        intercepted.$on('response', listener);
        const detach = attachInterceptors(client);

        detach();
        detach();

        await expect(client.get('/user/1')).rejects.toBeInstanceOf(AxiosError);
        expect(listener).not.toHaveBeenCalled();
    });

    it('adds the interceptors once per instance, also when it is called twice', async () => {
        const client = axios.create({ adapter: respondWith(500) });
        const listener = vi.fn();
        intercepted.$on('response:500', listener);

        const detach = attachInterceptors(client);
        const second = attachInterceptors(client);
        await expect(client.get('/user/1')).rejects.toBeInstanceOf(AxiosError);

        expect(second).toBe(detach);
        expect(listener).toHaveBeenCalledTimes(1);
        detach();
    });

    it('can attach again after detach', async () => {
        const client = axios.create({ adapter: respondWith(500) });
        const listener = vi.fn();
        intercepted.$on('response:500', listener);

        attachInterceptors(client)();
        const detach = attachInterceptors(client);
        await expect(client.get('/user/1')).rejects.toBeInstanceOf(AxiosError);

        expect(listener).toHaveBeenCalledTimes(1);
        detach();
    });

    it('emits no events for a failed request with errorHandle: false', async () => {
        const client = axios.create({ adapter: respondWith(500) });
        const listener = vi.fn();
        intercepted.$on('response', listener);
        attachInterceptors(client);

        await expect(client.get('/user/1', { errorHandle: false })).rejects.toBeInstanceOf(AxiosError);

        expect(listener).not.toHaveBeenCalled();
    });

    it('rejects with the original error when no response came back', async () => {
        const client = axios.create({
            adapter: (config) => Promise.reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, {})),
        });
        attachInterceptors(client);

        await expect(client.get('/user/1')).rejects.toMatchObject({ code: AxiosError.ERR_NETWORK });
    });

    it('rejects with the original error when a request interceptor fails', async () => {
        const client = axios.create({ adapter: respondWith(200) });
        const error = new Error('No token');
        client.interceptors.request.use(() => { throw error; });
        attachInterceptors(client);

        await expect(client.get('/user/1')).rejects.toBe(error);
    });
});
