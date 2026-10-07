import type { AxiosResponse } from 'axios';

/** The category of a status, for example 'client-error' for 404. */
export type InterceptedCategory = 'informational' | 'success' | 'redirection' | 'client-error' | 'server-error';

/**
 * An event that handleResponse emits: 'response', 'response:client-error', 'response:not-found',
 * 'response:404' or 'response:4xx'.
 */
export type InterceptedEvent = 'response' | `response:${string}`;

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
    headers: AxiosResponse['headers'];
}

/** The event bus. It has the event methods of a Vue 2 instance. */
export interface InterceptedEmitter {
    $on<T = any>(event: InterceptedEvent | InterceptedEvent[], callback: (data: InterceptedResponse<T>) => unknown): this;
    $on(event: string | string[], callback: (...args: any[]) => unknown): this;
    $once<T = any>(event: InterceptedEvent | InterceptedEvent[], callback: (data: InterceptedResponse<T>) => unknown): this;
    $once(event: string | string[], callback: (...args: any[]) => unknown): this;
    /**
     * Without arguments, removes all listeners. With an event, removes all listeners of the event.
     * With an event and a callback, removes that listener.
     */
    $off(event?: string | string[], callback?: (...args: any[]) => unknown): this;
    $emit(event: string, ...args: any[]): this;
}

/** The event bus. In the browser, it is also on window.intercepted. */
export const intercepted: InterceptedEmitter;

/**
 * Emits the events for a response. Call it in an axios response interceptor.
 * Returns false and emits nothing if there is no response or no valid status.
 */
export default function handleResponse(
    response: Pick<AxiosResponse, 'status' | 'data' | 'headers'> | null | undefined,
): boolean;

declare global {
    interface Window {
        intercepted: InterceptedEmitter;
    }
}
