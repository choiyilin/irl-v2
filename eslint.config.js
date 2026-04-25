// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactNative from 'eslint-plugin-react-native';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';
import unicorn from 'eslint-plugin-unicorn';
import promise from 'eslint-plugin-promise';
import a11y from 'eslint-plugin-jsx-a11y';
import tanstackQuery from '@tanstack/eslint-plugin-query';
import functional from 'eslint-plugin-functional';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  // Ignored paths
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'coverage/**',
      'ios/**',
      'android/**',
      'src/api/supabase/types.generated.ts',
      'metro.config.js',
      'babel.config.js',
      'jest.config.js',
      'jest.setup.js',
      '.maestro/**',
    ],
  },

  // Base
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Project-wide language options
  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es2022,
      },
    },
    settings: {
      react: { version: 'detect' },
    },
  },

  // React + RN + plugins
  {
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      'react-native': reactNative,
      import: importPlugin,
      'unused-imports': unusedImports,
      unicorn,
      promise,
      'jsx-a11y': a11y,
      '@tanstack/query': tanstackQuery,
    },
    rules: {
      // Type safety — non-negotiable
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/strict-boolean-expressions': [
        'error',
        { allowNullableBoolean: true, allowNullableString: false, allowNullableNumber: false },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Ban `as` casts everywhere except `as const` (allowlist enforced via override below for src/lib/brand.ts)
      'no-restricted-syntax': [
        'error',
        {
          selector: "TSAsExpression > :not(TSTypeReference[typeName.name='const'])",
          message:
            'Do not use `as` casts. Use a typed parser (zod) at boundaries; for branded types, use the helpers in src/lib/brand.ts.',
        },
      ],

      // Complexity caps
      complexity: ['error', 10],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 4],

      // React
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',

      // React Native
      'react-native/no-unused-styles': 'error',
      'react-native/no-inline-styles': 'error',
      'react-native/no-color-literals': 'error',
      'react-native/no-raw-text': 'off',

      // Imports
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'unused-imports/no-unused-imports': 'error',

      // Unicorn (selective)
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/no-array-reduce': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],

      // Promises
      'promise/always-return': 'error',
      'promise/no-return-wrap': 'error',
      'promise/catch-or-return': 'error',

      // TanStack Query
      '@tanstack/query/exhaustive-deps': 'error',
      '@tanstack/query/no-rest-destructuring': 'error',
      '@tanstack/query/stable-query-client': 'error',

      // General hygiene
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*'],
              message: 'Use absolute imports via @/ alias instead of relative parent imports.',
            },
          ],
        },
      ],
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'prefer-const': 'error',
    },
  },

  // Functional core for features only
  {
    files: ['src/features/**/*.ts', 'src/features/**/*.tsx', 'src/lib/**/*.ts'],
    plugins: { functional },
    rules: {
      'functional/immutable-data': [
        'error',
        { ignoreClasses: true, ignoreImmediateMutation: true },
      ],
      'functional/no-let': 'error',
    },
  },

  // The single allowlist file for `as` casts (branded type constructors)
  {
    files: ['src/lib/brand.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },

  // Test files relax some rules
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'src/test/**/*.ts', 'src/test/**/*.tsx'],
    rules: {
      'max-lines-per-function': 'off',
      'max-lines': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-restricted-syntax': 'off',
      'functional/immutable-data': 'off',
      'functional/no-let': 'off',
    },
  },

  // App router shells: relax line caps because they're trivially thin shells but may exceed
  // the function-line cap when wrapping providers
  {
    files: ['app/**/*.tsx', 'app/**/*.ts'],
    rules: {
      'unicorn/filename-case': 'off',
    },
  },

  // Disable formatting rules that conflict with Prettier
  prettierConfig,
);
