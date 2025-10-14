// apps/backend/src/config/cors.js
import cors from 'cors';
import { env } from './env.js';

/**
 * Normaliza el allowlist desde .env
 *  - acepta vacío (permite same-origin y curl/Postman sin origin)
 *  - tolera números, undefined, espacios, etc.
 */
const raw = (env.cors.allowlist ?? '').toString();
const allowlist = new Set(
  raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);

/**
 * Reglas CORS comunes
 */
const options = {
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],

  // Permite same-origin (cuando no viene Origin, p.ej. curl/Postman)
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (allowlist.size === 0 || allowlist.has(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },

  optionsSuccessStatus: 204,
  preflightContinue: false,
};

const corsMiddleware = cors(options);

export const preflight = cors(options);

export default corsMiddleware;
