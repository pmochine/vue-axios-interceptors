// Compile-time checks for src/index.d.ts. Run with: npm run test:types
import axios from 'axios';
import handleResponse, {
    intercepted,
    type InterceptedEmitter,
    type InterceptedResponse,
} from '../../src/index';

axios.interceptors.response.use(
    (response) => {
        const handled: boolean = handleResponse(response);
        return handled ? response : response;
    },
    (error) => {
        if (axios.isAxiosError(error)) {
            handleResponse(error.response);
        }
        return Promise.reject(error);
    },
);

handleResponse(undefined);
handleResponse(null);
handleResponse({ status: 404, data: null, headers: {} });

// @ts-expect-error status is a number
handleResponse({ status: '404', data: null, headers: {} });

// The listener of a response event gets the response data
intercepted.$on('response:404', (data) => {
    const status: number = data.status;
    const code: string | null = data.code;
    // @ts-expect-error code can be null
    const name: string = data.code;
    return [status, code, name];
});

// The body can have a type, for example the Laravel validation errors
intercepted.$on<Record<string, string>>('response:422', (data) => {
    const message: string | undefined = data.body.email;
    return message;
});

intercepted.$once(['response:401', 'response:419'], (data: InterceptedResponse) => data.status);

// Code from 1.x can use the event bus for its own events
intercepted.$on('user:logout', (user: { id: number }, reason: string) => [user.id, reason]);
intercepted.$emit('user:logout', { id: 1 }, 'expired');

const listener = (data: InterceptedResponse) => data;
intercepted.$off('response', listener);
intercepted.$off(['response', 'response:5xx']);
intercepted.$off();

// The methods return the event bus
const chained: InterceptedEmitter = intercepted.$on('response', listener).$off('response', listener);

// In the browser, the event bus is also on window
const global: InterceptedEmitter = window.intercepted;
window.intercepted.$on('response:server-error', listener);

// @ts-expect-error the event name is a string
intercepted.$on(404, listener);

export { chained, global };
