import globals from 'globals';

const commonGlobals = {
  console: 'readonly',
  globalThis: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  queueMicrotask: 'readonly',
  URL: 'readonly',
};

const browserGlobals = {
  ...globals.browser,
};

const nodeGlobals = {
  ...globals.node,
};

export default [
  {
    ignores: ['**/dist/**', '**/build/**', 'node_modules'],
  },
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...commonGlobals,
        Intl: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'smart'],
      semi: ['error', 'always'],
      'no-trailing-spaces': 'warn',
      'no-multiple-empty-lines': ['warn', { max: 1, maxEOF: 0 }],
    },
  },
  {
    files: [
      'apps/backend/**/*.{js,mjs,cjs}',
      'apps/admin/scripts/**/*.{js,mjs,cjs}',
      'apps/admin/test/**/*.{js,mjs,cjs}',
      'apps/client/scripts/**/*.{js,mjs,cjs}',
      'packages/rollup-plugin-visualizer/**/*.{js,mjs,cjs}',
      'scripts/**/*.{js,mjs,cjs}',
      '**/*.config.{js,mjs,cjs}',
    ],
    languageOptions: {
      globals: { ...commonGlobals, ...nodeGlobals },
    },
  },
  {
    files: ['apps/admin/src/**/*.{js,jsx}', 'apps/client/src/**/*.{js,jsx}'],
    languageOptions: {
      globals: { ...commonGlobals, ...browserGlobals },
    },
  },
  {
    files: ['apps/admin/src/utils/auth.js'],
    languageOptions: {
      globals: { process: 'readonly' },
    },
  },
  {
    files: ['apps/admin/test/rbac.integration.test.js'],
    languageOptions: {
      globals: { ...browserGlobals },
    },
  },
  {
    files: ['apps/client/test/**/*.{js,jsx,mjs,cjs}'],
    languageOptions: {
      globals: { ...commonGlobals, ...browserGlobals },
    },
  },
  {
    files: ['**/*.test.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        ...commonGlobals,
        ...nodeGlobals,
        describe: 'readonly',
        it: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        expect: 'readonly',
      },
    },
  },
];
