// apps/backend/src/app.js
import express from 'express';
import morgan from 'morgan';

import { env } from './config/env.js';
import corsMiddleware, { preflight } from './config/cors.js';

import requestId from './middlewares/requestId.js';
import requestTimeout from './middlewares/requestTimeout.js';
import errorHandler from './middlewares/errorHandler.js';

import router from './routes/index.js';

const app = express();

/* Parsers (incluye urlencoded para formularios) */
app.use(express.json({ limit: env.limits.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: env.limits.bodyLimit }));

/* Contexto de request */
app.use(requestId);
app.use(requestTimeout);

/* CORS antes de montar rutas */
app.use(corsMiddleware);

/**
 * ✅ Preflight universal para Express 5 + path-to-regexp v6
 *    Usa RegExp para evitar los errores “Missing parameter name…”.
 *    Esto cubre OPTIONS /api/... y cualquier otra ruta.
 */
app.options(/.*/, preflight);

if (env.nodeEnv !== 'production') {
  app.use(morgan('dev'));
}

// log de cada request (temporal de diagnóstico)
app.use((req, _res, next) => {
  console.log(`[API] ${req.method} ${req.originalUrl}`);
  next();
});

/* Rutas reales bajo /api/v1 */
app.use('/api/v1', router);

/* 404 SOLO dentro del espacio /api */
app.all(/^\/api\/(.*)/, (_req, res) => {
  res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

/* Manejador global de errores (debe ir al final) */
app.use(errorHandler);

export default app;
