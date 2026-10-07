// Compile-time checks for src/vue.d.ts. Run with: npm run test:types
import { useIntercepted } from '../../src/vue';

const stop: () => void = useIntercepted('response:401', (data) => {
    const status: number = data.status;
    return status;
});
stop();

useIntercepted<Record<string, string>>('response:422', (data) => data.body.email);
useIntercepted(['response:401', 'response:419'], (data) => data.code);
useIntercepted('no-response', (data) => data.code);
useIntercepted('user:logout', (user: { id: number }) => user.id);

// @ts-expect-error no-response has no status
useIntercepted('no-response', (data) => data.status);

// @ts-expect-error no-response has no status, also in an array
useIntercepted(['no-response'], (data) => data.status);

// @ts-expect-error the event name is a string
useIntercepted(401, () => {});
