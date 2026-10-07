import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const fromRoot = (file) => fileURLToPath(new URL(file, import.meta.url));

// https://vite.dev/config/
export default defineConfig({
    build: {
        outDir: './dist',
        // ES2019 has no optional chaining, so older bundlers such as webpack 4 can parse the output
        target: 'es2019',
        lib: {
            entry: fromRoot('./src/index.js'),
            name: 'VueAxiosInterceptors',
            fileName: 'vue-axios-interceptors',
            formats: ['es', 'umd'],
        },
        rolldownOptions: {
            output: {
                // index.js has a named and a default export
                exports: 'named',
            },
        },
    },
    test: {
        include: ['tests/**/*.test.js'],
    },
});
