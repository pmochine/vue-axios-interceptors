// Version 1.x used a Vue 2 instance as event bus. Vue 3 removed $on, $off and $once, and the
// migration guide suggests an emitter library instead. This emitter keeps the method names and
// the behavior of the Vue 2 instance API, so listeners written for 1.x keep working.

const report = (error) => {
    // Vue 2 caught errors in listeners too, so one bad listener did not stop the others
    // or break the axios promise chain.
    if (typeof globalThis.reportError === 'function') {
        globalThis.reportError(error);
    } else {
        console.error(error); // eslint-disable-line no-console
    }
};

// Promises that already have a rejection handler. Vue 2.7 marks them with _handled,
// so a promise that several listeners return is reported once.
const handledPromises = new WeakSet();

const isPromise = (value) => value !== null && (typeof value === 'object' || typeof value === 'function')
    && typeof value.then === 'function' && typeof value.catch === 'function';

export default function createEmitter() {
    let listeners = new Map();

    const emitter = {
        $on(event, callback) {
            if (Array.isArray(event)) {
                event.forEach((name) => emitter.$on(name, callback));
                return emitter;
            }

            if (!listeners.has(event)) {
                listeners.set(event, []);
            }
            listeners.get(event).push(callback);

            return emitter;
        },

        $once(event, callback) {
            function once(...args) {
                emitter.$off(event, once);
                return callback.apply(this, args);
            }
            // Lets $off(event, callback) remove the listener before it runs
            once.fn = callback;

            return emitter.$on(event, once);
        },

        $off(...args) {
            const [event, callback] = args;

            if (args.length === 0) {
                listeners = new Map();
                return emitter;
            }

            if (Array.isArray(event)) {
                event.forEach((name) => emitter.$off(name, callback));
                return emitter;
            }

            const callbacks = listeners.get(event);
            if (!callbacks) {
                return emitter;
            }

            if (!callback) {
                listeners.delete(event);
                return emitter;
            }

            // Like Vue 2: remove one listener, the last one added
            for (let i = callbacks.length - 1; i >= 0; i -= 1) {
                if (callbacks[i] === callback || callbacks[i].fn === callback) {
                    callbacks.splice(i, 1);
                    break;
                }
            }

            return emitter;
        },

        $emit(event, ...args) {
            const callbacks = listeners.get(event);
            if (!callbacks) {
                return emitter;
            }

            // A copy, so a listener that calls $off does not skip the next listener
            [...callbacks].forEach((callback) => {
                try {
                    const result = callback.apply(emitter, args);
                    if (isPromise(result) && !handledPromises.has(result)) {
                        handledPromises.add(result);
                        result.catch(report);
                    }
                } catch (error) {
                    report(error);
                }
            });

            return emitter;
        },
    };

    return emitter;
}
