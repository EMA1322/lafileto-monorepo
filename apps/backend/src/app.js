// apps/backend/src/app.js
import express from 'express';
import morgan from 'morgan';

import env from './config/env.js';
import corsMiddleware, { preflight } from './config/cors.js';
import { requestId } from './middlewares/requestId.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { router } from './routes/index.js';

const app = express();

// ── JSON/body + límites ────────────────────────────────────────────────────────
app.use(express.json({ limit: env.limits.bodyLimit }));
app.use(requestId);

// ── CORS: primero el middleware general y el preflight ANTES de montar rutas ──
app.use(corsMiddleware);

// Usamos RegExp para evitar el bug del parser de rutas en Express 5.
// Maneja OPTIONS para /api y cualquier sub-ruta (/api/...):
app.options(/^\/api(\/.*)?$/, preflight);

// ── Logging solo en dev ───────────────────────────────────────────────────────
app.use(morgan('dev'));

// ── Rutas reales bajo /api/v1 ─────────────────────────────────────────────────
app.use('/api/v1', router);

// ── 404 del API ───────────────────────────────────────────────────────────────
app.use('/api', (_req, res) => {
  res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// ── Manejo de errores final ───────────────────────────────────────────────────
app.use(errorHandler);

export default app;
