import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(() => {
  const shouldAnalyze =
    Boolean(process.env.ANALYZE_BUNDLE) && process.env.ANALYZE_BUNDLE !== 'false';
  const backendTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:3000';

  return {
    plugins: [
      react(),
      ...(shouldAnalyze
        ? [
            visualizer({
              filename: path.resolve(__dirname, 'dist/stats-admin.html'),
              gzipSize: true,
              brotliSize: true,
              open: false,
            }),
          ]
        : []),
    ],
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
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          // Importante: no reescribimos el prefijo /api porque el backend expone /api/v1/*.
        },
      },
      // HMR estable en LAN (opcional; si ves problemas de HMR):
      // hmr: { host: '192.168.1.33', protocol: 'ws', port: 5174 },
    },
  };
});
