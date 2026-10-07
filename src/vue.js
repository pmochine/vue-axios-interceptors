import { getCurrentScope, onScopeDispose } from 'vue';
import { intercepted } from './index';

// Adds a listener to the event bus and removes it when the effect scope stops, for example
// when the component unmounts. Returns a function that removes the listener earlier.
// A named export, like other Vue composables.
// eslint-disable-next-line import/prefer-default-export
export const useIntercepted = (event, listener) => {
    // The server does not unmount components. A listener from setup() would stay on the
    // event bus, which all requests on the server share.
    if (typeof window === 'undefined') {
        return () => {};
    }

    // A copy, so a later change to the array does not change what stop() removes
    const events = Array.isArray(event) ? [...event] : event;

    // A function of its own for every call. stop() removes exactly this registration, also
    // when the same listener is on the event bus more than once, for example with $once.
    function registration(...args) {
        return listener.apply(this, args);
    }

    intercepted.$on(events, registration);

    const stop = () => intercepted.$off(events, registration);

    if (getCurrentScope()) {
        onScopeDispose(stop);
    }

    return stop;
};
