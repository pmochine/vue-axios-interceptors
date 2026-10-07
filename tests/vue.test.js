import {
    createRenderer, defineComponent, effectScope, h,
} from 'vue';
import {
    afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import handleResponse, { intercepted } from '../src/index';
import { useIntercepted } from '../src/vue';

// A renderer without a DOM. It is enough to mount and unmount components.
const { createApp } = createRenderer({
    createElement: (tag) => ({ tag }),
    createText: (text) => ({ text }),
    createComment: (text) => ({ text }),
    insert: () => {},
    remove: () => {},
    setText: () => {},
    setElementText: () => {},
    parentNode: () => null,
    nextSibling: () => null,
    patchProp: () => {},
});

const respond = (status) => handleResponse({ status, data: null, headers: {} });

describe('useIntercepted', () => {
    beforeEach(() => {
        // In the browser
        vi.stubGlobal('window', {});
    });

    afterEach(() => {
        intercepted.$off();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('removes the listener when the component unmounts', () => {
        const listener = vi.fn();
        const app = createApp(defineComponent({
            setup() {
                useIntercepted('response:401', listener);
                return () => h('div');
            },
        }));

        app.mount({ tag: 'root' });
        respond(401);
        app.unmount();
        respond(401);

        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener.mock.calls[0][0].status).toBe(401);
    });

    it('removes the listener when the effect scope stops', () => {
        const listener = vi.fn();
        const scope = effectScope();

        scope.run(() => useIntercepted(['response:401', 'response:403'], listener));
        respond(401);
        respond(403);
        scope.stop();
        respond(401);
        respond(403);

        expect(listener).toHaveBeenCalledTimes(2);
    });

    it('returns a function that removes the listener earlier', () => {
        const listener = vi.fn();
        const scope = effectScope();

        const stop = scope.run(() => useIntercepted('response:404', listener));
        stop();
        respond(404);

        expect(listener).not.toHaveBeenCalled();
        scope.stop();
    });

    it('removes only its own listener when the same function is used twice', () => {
        const listener = vi.fn();
        const first = effectScope();
        const second = effectScope();
        const stop = first.run(() => useIntercepted('response:404', listener));
        second.run(() => useIntercepted('response:404', listener));

        stop();
        first.stop();
        respond(404);

        expect(listener).toHaveBeenCalledTimes(1);
        second.stop();
    });

    it('works outside of a component without a warning, until stop is called', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const listener = vi.fn();

        const stop = useIntercepted('no-response', listener);
        intercepted.$emit('no-response', { code: 'ERR_NETWORK', error: {} });
        stop();
        intercepted.$emit('no-response', { code: 'ERR_NETWORK', error: {} });

        expect(listener).toHaveBeenCalledTimes(1);
        expect(warn).not.toHaveBeenCalled();
    });

    it('adds no listener on the server, where components do not unmount', () => {
        vi.unstubAllGlobals();
        expect(typeof window).toBe('undefined');
        const listener = vi.fn();
        const scope = effectScope();

        const stop = scope.run(() => useIntercepted('response:401', listener));
        respond(401);

        expect(listener).not.toHaveBeenCalled();
        expect(stop).toBeTypeOf('function');
        scope.stop();
    });
});
