// The types do not import axios. axios 1.0 ships ESM-only types, and a CommonJS consumer
// cannot import them from this CommonJS declaration file. An AxiosResponse fits these types.

/** The category of a status, for example 'client-error' for 404. */
export type InterceptedCategory = 'informational' | 'success' | 'redirection' | 'client-error' | 'server-error';

/**
 * An event that handleResponse emits: 'response', 'response:client-error', 'response:not-found',
 * 'response:404' or 'response:4xx'.
 */
export type InterceptedEvent = 'response' | `response:${string}`;

/** The parts of a response that handleResponse reads. An axios response fits. */
export interface HandledResponse {
    /** An integer from 100 to 599. handleResponse ignores other values. */
    status: number;
    data: any;
    headers: Record<string, any>;
}

/** The data of every event that handleResponse emits. */
export interface InterceptedResponse<T = any> {
    /** The HTTP status, for example 404. */
    status: number;
    /** The name of the status, for example 'Not Found'. null for a status without a name in the list. */
    code: string | null;
    /**
     * The response body. For a 422 response with Laravel validation errors, an object with one
     * string per field. Several messages of a field are joined with a comma.
     */
    body: T;
    /** The response headers. */
    headers: Record<string, any>;
    /**
     * The response that handleResponse got, for example the axios response. Use it for the
     * request (response.config.url) or for the body before the 422 parsing (response.data).
     */
    response: HandledResponse & Record<string, any>;
}

/** A listener for the events of handleResponse. */
export type InterceptedListener<T = any> = (this: InterceptedEmitter, data: InterceptedResponse<T>) => unknown;

/** The event bus. It has the event methods of a Vue 2 instance. */
export interface InterceptedEmitter {
    $on<T = any>(event: InterceptedEvent | InterceptedEvent[], callback: InterceptedListener<T>): this;
    $on(event: string | string[], callback: (this: InterceptedEmitter, ...args: any[]) => unknown): this;
    $once<T = any>(event: InterceptedEvent | InterceptedEvent[], callback: InterceptedListener<T>): this;
    $once(event: string | string[], callback: (this: InterceptedEmitter, ...args: any[]) => unknown): this;
    /**
     * Without arguments, removes all listeners. With an event, removes all listeners of the event.
     * With an event and a callback, removes that listener.
     */
    $off(event?: string | string[], callback?: ((...args: any[]) => unknown) | null): this;
    $emit(event: string, ...args: any[]): this;
}

/** The event bus. In the browser, it is also on window.intercepted. */
export const intercepted: InterceptedEmitter;

/** An axios instance from axios.create(), or the default axios export. */
export interface InterceptableInstance {
    interceptors: {
        response: {
            use(onFulfilled: (response: any) => any, onRejected: (error: any) => any): number;
            eject(id: number): void;
        };
    };
}

/**
 * Adds the response interceptors of this package to an axios instance and returns a function
 * that removes them. A second call for the same instance adds nothing and returns the same function.
 * A failed request with the config option errorHandle: false emits no events.
 */
export function attachInterceptors(instance: InterceptableInstance): () => void;

/**
 * Emits the events for a response. Call it in an axios response interceptor.
 * Returns false and emits nothing if there is no response or no valid status.
 */
export default function handleResponse(response: HandledResponse | null | undefined): boolean;

declare global {
    interface Window {
        intercepted: InterceptedEmitter;
    }
}
