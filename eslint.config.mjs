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
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  location: 'readonly',
  fetch: 'readonly',
  Headers: 'readonly',
  Request: 'readonly',
  Response: 'readonly',
  URLSearchParams: 'readonly',
  FormData: 'readonly',
  HTMLElement: 'readonly',
  Element: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  confirm: 'readonly',
  requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly',
};

const nodeGlobals = {
  process: 'readonly',
  module: 'readonly',
  require: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  global: 'readonly',
};

export default [
  {
    ignores: ['**/dist/**', '**/build/**', 'node_modules'],
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...commonGlobals,
        ...browserGlobals,
        ...nodeGlobals,
        ...globals.browser,
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
      '**/scripts/**/*.{js,mjs}',
      '**/*.config.js',
      '**/*.config.cjs',
    ],
    languageOptions: {
      globals: { ...commonGlobals, ...nodeGlobals },
    },
  },
  {
    files: ['apps/**/src/**/*.{js,jsx}'],
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
