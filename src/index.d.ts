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
