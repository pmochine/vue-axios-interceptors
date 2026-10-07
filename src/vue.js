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

    intercepted.$on(event, listener);

    let active = true;
    const stop = () => {
        if (active) {
            active = false;
            intercepted.$off(event, listener);
        }
    };

    if (getCurrentScope()) {
        onScopeDispose(stop);
    }

    return stop;
};
