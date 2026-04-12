import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setupTests.js'],
    include: ['test/**/*.test.{js,jsx}'],
    css: true,
  },

  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  resolve: {
    alias: {
      '/src': fileURLToPath(new URL('./src', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared-utils': fileURLToPath(new URL('../../packages/shared-utils/src', import.meta.url)),
    },
  },
});
