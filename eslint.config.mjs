import avidofood from 'eslint-config-avidofood';

export default [
    {
        // Build output
        ignores: ['dist/**'],
    },
    ...avidofood,
];
