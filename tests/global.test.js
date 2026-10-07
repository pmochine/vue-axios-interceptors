import {
    afterEach, describe, expect, it, vi,
} from 'vitest';

describe('the global event bus', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it('is on window.intercepted in the browser, as in version 1.x', async () => {
        vi.stubGlobal('window', {});

        const { intercepted } = await import('../src/index');

        expect(window.intercepted).toBe(intercepted);
    });

    it('is shared by two copies of the package, for example an ES module and a CommonJS copy', async () => {
        vi.stubGlobal('window', {});
        const first = await import('../src/index');
        vi.resetModules();
        const second = await import('../src/index');
        const listener = vi.fn();
        first.intercepted.$on('response:404', listener);

        second.default({ status: 404, data: null, headers: {} });

        expect(second.intercepted).toBe(first.intercepted);
        expect(window.intercepted).toBe(first.intercepted);
        expect(listener).toHaveBeenCalledTimes(1);
        first.intercepted.$off();
    });

    it('loads without window, for example during server-side rendering', async () => {
        expect(typeof window).toBe('undefined');

        const { intercepted } = await import('../src/index');

        expect(intercepted.$on).toBeTypeOf('function');
    });
});
