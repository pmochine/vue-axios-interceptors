import {
    afterEach, describe, expect, it, vi,
} from 'vitest';
import createEmitter from '../src/emitter';

// The emitter follows the event API of a Vue 2 instance ($on, $once, $off, $emit)
describe('createEmitter', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('calls listeners with all arguments, in the order they were added', () => {
        const emitter = createEmitter();
        const calls = [];
        emitter.$on('event', (...args) => calls.push(['first', ...args]));
        emitter.$on('event', (...args) => calls.push(['second', ...args]));

        emitter.$emit('event', 1, 2);

        expect(calls).toEqual([['first', 1, 2], ['second', 1, 2]]);
    });

    it('calls listeners with the emitter as this', () => {
        const emitter = createEmitter();
        let self;
        emitter.$on('event', function listener() { self = this; });

        emitter.$emit('event');

        expect(self).toBe(emitter);
    });

    it('returns the emitter from every method', () => {
        const emitter = createEmitter();
        const listener = () => {};

        expect(emitter.$on('a', listener)).toBe(emitter);
        expect(emitter.$once('a', listener)).toBe(emitter);
        expect(emitter.$emit('a')).toBe(emitter);
        expect(emitter.$emit('unknown')).toBe(emitter);
        expect(emitter.$off('a', listener)).toBe(emitter);
        expect(emitter.$off('a')).toBe(emitter);
        expect(emitter.$off()).toBe(emitter);
    });

    it('accepts an array of events in $on and $off', () => {
        const emitter = createEmitter();
        const listener = vi.fn();
        emitter.$on(['a', 'b'], listener);

        emitter.$emit('a');
        emitter.$emit('b');
        emitter.$off(['a', 'b'], listener);
        emitter.$emit('a');
        emitter.$emit('b');

        expect(listener).toHaveBeenCalledTimes(2);
    });

    it('calls a $once listener one time', () => {
        const emitter = createEmitter();
        const listener = vi.fn();
        emitter.$once('event', listener);

        emitter.$emit('event', 'data');
        emitter.$emit('event', 'data');

        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith('data');
    });

    it('removes a $once listener with the original function', () => {
        const emitter = createEmitter();
        const listener = vi.fn();
        emitter.$once('event', listener);

        emitter.$off('event', listener);
        emitter.$emit('event');

        expect(listener).not.toHaveBeenCalled();
    });

    it('removes one listener per $off call, like Vue 2', () => {
        const emitter = createEmitter();
        const listener = vi.fn();
        emitter.$on('event', listener);
        emitter.$on('event', listener);

        emitter.$off('event', listener);
        emitter.$emit('event');

        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('removes all listeners of an event with $off(event)', () => {
        const emitter = createEmitter();
        const removed = vi.fn();
        const kept = vi.fn();
        emitter.$on('event', removed);
        emitter.$on('event', removed);
        emitter.$on('other', kept);

        emitter.$off('event');
        emitter.$emit('event');
        emitter.$emit('other');

        expect(removed).not.toHaveBeenCalled();
        expect(kept).toHaveBeenCalledTimes(1);
    });

    it('removes all listeners with $off()', () => {
        const emitter = createEmitter();
        const listener = vi.fn();
        emitter.$on('a', listener);
        emitter.$on('b', listener);

        emitter.$off();
        emitter.$emit('a');
        emitter.$emit('b');

        expect(listener).not.toHaveBeenCalled();
    });

    it('ignores $off for an unknown event or listener', () => {
        const emitter = createEmitter();
        const listener = vi.fn();
        emitter.$on('event', listener);

        emitter.$off('unknown', listener);
        emitter.$off('event', () => {});
        emitter.$emit('event');

        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('calls the next listener when a listener removes itself', () => {
        const emitter = createEmitter();
        const second = vi.fn();
        const first = () => emitter.$off('event', first);
        emitter.$on('event', first);
        emitter.$on('event', second);

        emitter.$emit('event');

        expect(second).toHaveBeenCalledTimes(1);
    });

    it('reports an error in a listener and calls the other listeners', () => {
        vi.stubGlobal('reportError', vi.fn());
        const emitter = createEmitter();
        const error = new Error('listener failed');
        const second = vi.fn();
        emitter.$on('event', () => { throw error; });
        emitter.$on('event', second);

        expect(() => emitter.$emit('event')).not.toThrow();
        expect(second).toHaveBeenCalledTimes(1);
        expect(globalThis.reportError).toHaveBeenCalledWith(error);
    });

    it('reports a rejected promise of an async listener', async () => {
        vi.stubGlobal('reportError', vi.fn());
        const emitter = createEmitter();
        const error = new Error('async listener failed');
        emitter.$on('event', async () => { throw error; });
        emitter.$once('once', async () => { throw error; });

        emitter.$emit('event');
        emitter.$emit('once');
        await new Promise((resolve) => { setTimeout(resolve); });

        expect(globalThis.reportError).toHaveBeenCalledTimes(2);
        expect(globalThis.reportError).toHaveBeenCalledWith(error);
    });

    it('reports a rejected promise once when listeners return the same promise, like Vue 2.7', async () => {
        vi.stubGlobal('reportError', vi.fn());
        const emitter = createEmitter();
        const rejected = Promise.reject(new Error('shared'));
        emitter.$on(['a', 'b'], () => rejected);

        emitter.$emit('a');
        emitter.$emit('b');
        await new Promise((resolve) => { setTimeout(resolve); });

        expect(globalThis.reportError).toHaveBeenCalledTimes(1);
    });

    it('logs the error with console.error without reportError', () => {
        vi.stubGlobal('reportError', undefined);
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const emitter = createEmitter();
        const error = new Error('listener failed');
        emitter.$on('event', () => { throw error; });

        emitter.$emit('event');

        expect(console.error).toHaveBeenCalledWith(error); // eslint-disable-line no-console
    });
});
