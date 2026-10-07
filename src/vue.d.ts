import type {
    InterceptedEmitter, InterceptedEvent, InterceptedListener, InterceptedNoResponse,
} from './index';

/**
 * Adds a listener to the event bus and removes it when the component unmounts or the effect
 * scope stops. Returns a function that removes the listener earlier. On the server, it adds
 * no listener, because the server does not unmount components.
 */
export function useIntercepted<T = any>(
    event: InterceptedEvent | InterceptedEvent[],
    listener: InterceptedListener<T>,
): () => void;
export function useIntercepted(
    event: 'no-response',
    listener: (this: InterceptedEmitter, data: InterceptedNoResponse) => unknown,
): () => void;
export function useIntercepted(
    event: string | string[],
    listener: (this: InterceptedEmitter, ...args: any[]) => unknown,
): () => void;
