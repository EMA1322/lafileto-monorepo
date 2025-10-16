import { defineConfig } from 'vite';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(() => {
  const shouldAnalyze = Boolean(process.env.ANALYZE_BUNDLE) && process.env.ANALYZE_BUNDLE !== 'false';

  return {
    plugins: shouldAnalyze
      ? [
          visualizer({
            filename: path.resolve(__dirname, 'dist/stats-admin.html'),
            gzipSize: true,
            brotliSize: true,
            open: false,
          }),
        ]
      : [],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src'),
      },
    },
    server: {
      host: true, // 0.0.0.0
      port: 5174,
      strictPort: true,
      // Proxy para /api -> backend local; así evitamos CORS en desarrollo.
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,

          // Importante: no reescribimos el prefijo /api porque el backend expone /api/v1/*.

        },
      },
    },
  };
});
