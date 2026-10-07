import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('the types', () => {
    // axios 1.0 ships ESM-only types. A CommonJS consumer cannot load them from
    // dist/index.d.ts, so the types must not import axios or any other package.
    it('import nothing', () => {
        const source = readFileSync(new URL('../src/index.d.ts', import.meta.url), 'utf8');

        expect(source).not.toMatch(/^\s*import\b/m);
        expect(source).not.toMatch(/\bimport\(/);
    });
});
