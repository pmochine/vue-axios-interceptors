import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const fromRoot = (file) => fileURLToPath(new URL(file, import.meta.url));

// One file per import path of the package, see "exports" in package.json
const entries = ['index'];

// Copies the hand-written types next to the build. Without "type": "module" in package.json,
// TypeScript reads a .d.ts file as CommonJS and a .d.mts file as ESM, so we ship both.
// A relative import in the types gets the extension of its format, so './index' in a .d.mts
// file loads index.d.mts.
const types = () => ({
    name: 'types',
    generateBundle({ format }) {
        if (format !== 'es') return;
        entries.forEach((entry) => {
            const source = readFileSync(fromRoot(`./src/${entry}.d.ts`), 'utf8');
            const withExtension = (extension) => source.replace(/from '\.\/(\w+)'/g, `from './$1.${extension}'`);
            this.emitFile({ type: 'asset', fileName: `${entry}.d.ts`, source: withExtension('js') });
            this.emitFile({ type: 'asset', fileName: `${entry}.d.mts`, source: withExtension('mjs') });
        });
    },
});

// https://vite.dev/config/
export default defineConfig({
    build: {
        outDir: './dist',
        // ES2019 has no optional chaining, so older bundlers such as webpack 4 can parse the output
        target: 'es2019',
        lib: {
            entry: Object.fromEntries(entries.map((entry) => [entry, fromRoot(`./src/${entry}.js`)])),
            formats: ['es', 'cjs'],
            fileName: (format, entry) => `${entry}.${format === 'es' ? 'mjs' : 'cjs'}`,
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
