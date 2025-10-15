// Router raíz v1: health y módulos reales (auth, rbac)
import { Router } from 'express';
import { authRoutes } from './auth.routes.js';
import { rbacRoutes } from './rbac.routes.js';
import { debugRouter } from './debug.routes.js';

export const router = Router();

// Bienvenida
router.get('/', (_req, res) => {
  res.json({ ok: true, data: { service: 'La Fileto API', status: 'running' } });
});

// Healthcheck
router.get('/health', (_req, res) => {
  res.json({ ok: true, data: { status: 'healthy', ts: new Date().toISOString() } });
});

if (process.env.NODE_ENV !== 'production') {
  // Endpoint de salud en dev para validar que el proxy llega al backend.
  router.get('/_debug/ping', (_req, res) => {
    res.json({ ok: true, ts: new Date().toISOString() });
  });
}

// Routers reales bajo /api/v1
router.use('/auth', authRoutes);
router.use('/rbac', rbacRoutes);

if (process.env.NODE_ENV !== 'production') {
  router.use('/_debug', debugRouter);
}

export default router;
