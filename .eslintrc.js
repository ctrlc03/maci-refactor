module.exports = {
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    env: {
        node: true,
        es6: true,
    },
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
    },
    rules: {
        // Add your custom rules here
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/ban-ts-comment': 'off',
    },
};