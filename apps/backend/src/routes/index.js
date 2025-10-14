import { Router } from 'express';
import { authRoutes } from './auth.routes.js';
import { rbacRoutes } from './rbac.routes.js';

const router = Router();

router.get('/', (_req, res) =>
  res.json({ ok: true, data: { service: 'La Fileto API', status: 'running' } }),
);

router.get('/health', (_req, res) =>
  res.json({ ok: true, data: { status: 'healthy', ts: new Date().toISOString() } }),
);

router.use('/auth', authRoutes);
router.use('/rbac', rbacRoutes);

export default router;
