import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src'),
    },
  },
  server: {
    host: true, // 0.0.0.0
    port: 5173,
    strictPort: true,
    // HMR estable en LAN (opcional; si ves problemas de HMR):
    // hmr: { host: '192.168.1.33', protocol: 'ws', port: 5173 },
  },
});
