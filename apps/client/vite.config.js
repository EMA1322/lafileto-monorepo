import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import path from 'node:path';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(() => {
  const shouldAnalyze = Boolean(process.env.ANALYZE_BUNDLE) && process.env.ANALYZE_BUNDLE !== 'false';

  return {
    plugins: shouldAnalyze
      ? [
          visualizer({
            filename: path.resolve(fileURLToPath(new URL('.', import.meta.url)), 'dist/stats-client.html'),
            gzipSize: true,
            brotliSize: true,
            open: false,
          }),
        ]
      : [],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@shared-utils': fileURLToPath(new URL('../../packages/shared-utils/src', import.meta.url)),
      },
    },
  };
});
