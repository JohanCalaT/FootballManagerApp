// Flat config for ESLint v9+/v10
// Docs: https://eslint.org/docs/latest/use/configure/configuration-files
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Ignore non-source artifacts so ESLint doesn't crawl them.
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'reports/**',
      '*.config.js',
      '*.config.mjs',
    ],
  },

  // Base recommended rules from ESLint core.
  js.configs.recommended,

  // Recommended TypeScript rules (parser + plugin bundled).
  ...tseslint.configs.recommended,

  // Project-specific overrides.
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
    },
    rules: {
      // CLAUDE.md convention: TypeScript estricto, prohibido `any`.
      '@typescript-eslint/no-explicit-any': 'error',

      // Allow unused args/vars prefixed with `_` (common pattern for ignored params).
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Logs are OK in a server app (we'll switch to a logger later).
      'no-console': 'off',

      // Prefer const where possible.
      'prefer-const': 'error',
    },
  },

  // Relaxed rules for tests — supertest + jest set globals at runtime.
  {
    files: ['tests/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
