// eslint.config.js
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended, // Recommended ESLint rules for JavaScript
  ...tseslint.configs.recommended, // Recommended rules for TypeScript
  {
    // Global ignores for the entire configuration
    ignores: ['node_modules/', 'build/', 'dist/', 'yarn.lock'],
  },
  {
    // Specific configurations for TypeScript files
    files: ['**/*.ts', '**/*.mts', '**/*.cts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json', // Path to your tsconfig.json
        sourceType: 'module',
      },
    },
    rules: {
      'no-console': 'error',
      'no-duplicate-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
);
