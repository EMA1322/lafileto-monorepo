import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared-utils': fileURLToPath(new URL('../../packages/shared-utils/src', import.meta.url)),
    },
  },
});
