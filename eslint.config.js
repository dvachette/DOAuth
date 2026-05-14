const jest = require('eslint-plugin-jest');
const tsParser = require('@typescript-eslint/parser');

module.exports = [
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsParser,
        },
        plugins: { jest },
        rules: {},
    },
    {
        files: ['**/*.test.ts'],
        ...jest.configs['flat/recommended'],
    },
];