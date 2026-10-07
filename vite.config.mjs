import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const fromRoot = (file) => fileURLToPath(new URL(file, import.meta.url));

// Copies the hand-written types next to the build. Without "type": "module" in package.json,
// TypeScript reads a .d.ts file as CommonJS and a .d.mts file as ESM, so we ship both.
const types = () => ({
    name: 'types',
    generateBundle({ format }) {
        if (format !== 'es') return;
        const source = readFileSync(fromRoot('./src/index.d.ts'), 'utf8');
        this.emitFile({ type: 'asset', fileName: 'index.d.ts', source });
        this.emitFile({ type: 'asset', fileName: 'index.d.mts', source });
    },
});

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
    plugins: [types()],
    test: {
        include: ['tests/**/*.test.js'],
    },
});
