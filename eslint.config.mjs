import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  js.configs.recommended,

  // Rules for TypeScript files
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      globals: {
        ...globals.node
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  },

  // Rules for JavaScript setup files (Jest setup files)
  {
    files: ['tests/setup/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node
      }
    }
  },

  // Keep ES modules such as this ESLint config in module mode
  {
    files: ['*.mjs'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    }
  },

  // Ignore compiled files and auto-generated files
  {
    ignores: ['node_modules/', 'dist/', 'coverage/', 'swagger.json']
  }
];
