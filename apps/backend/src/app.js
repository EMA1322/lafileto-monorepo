import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { corsMiddleware, getCorsAllowlist } from './config/cors.js';
import { requestId } from './middlewares/requestId.js';
import { requestTimeout } from './middlewares/requestTimeout.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { router } from './routes/index.js';
import { ok } from './utils/envelope.js';

const app = express();

// Si vas a estar detrás de Nginx/Cloudflare en prod, descomenta:
// app.set("trust proxy", 1);

app.use(express.json({ limit: env.limits.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: env.limits.bodyLimit }));
// Registramos CORS antes de requestTimeout y del resto de middlewares/rutas.
app.use(corsMiddleware);
// Respuesta inmediata a preflight (OPTIONS) para cualquier endpoint (204).
app.options(/.*/, corsMiddleware);
app.use(requestId());
app.use(requestTimeout(env.limits.requestTimeoutMs));
app.use(helmet());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json(ok({ status: 'up', ts: Date.now() }));
});

// Handler reutilizable para el ping tanto directo como detrás del proxy de Vite.
const debugPingHandler = (req, res) => {
  res.json(ok({ pong: true, ts: Date.now(), requestId: req.id || req.requestId }));
};

app.get('/_debug/ping', debugPingHandler);
// Alias requerido para que el proxy del Admin (`/api/*`) pueda alcanzar el ping sin reescritura adicional.
app.get('/api/_debug/ping', debugPingHandler);

if (env.nodeEnv === 'development') {
  const debugCorsHandler = (_req, res) => {
    res.json(ok({ allowlist: getCorsAllowlist(), now: new Date().toISOString() }));
  };

  app.get('/_debug/cors', debugCorsHandler);
  app.get('/api/_debug/cors', debugCorsHandler);
}

app.use('/api/v1', router);

// 404 para rutas desconocidas dentro de /api/v1
app.use('/api', (_req, res) =>
  res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }),
);

// Manejador de errores final
app.use(errorHandler);

export default app;
