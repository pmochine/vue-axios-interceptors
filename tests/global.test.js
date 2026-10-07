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

    it('loads without window, for example during server-side rendering', async () => {
        expect(typeof window).toBe('undefined');

        const { intercepted } = await import('../src/index');

        expect(intercepted.$on).toBeTypeOf('function');
    });
});
