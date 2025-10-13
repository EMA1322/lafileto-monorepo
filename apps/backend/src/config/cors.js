import cors from 'cors';
import env from './env.js';

// Normalizamos el allowlist para que siempre sea array
const list = Array.isArray(env.cors?.allowlist)
  ? env.cors.allowlist
  : String(env.cors?.allowlist ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

const allowlist = new Set(list);

const options = {
  credentials: true,
  methods: 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization'],

  // Permite mismo origen o los de la allowlist; bloquea el resto
  origin(origin, cb) {
    if (!origin) return cb(null, true); // curl/postman
    if (allowlist.size === 0 || allowlist.has(origin))
      // lista vacía = libre en dev
      return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },

  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Middleware normal (GET/POST/…)
export const corsMiddleware = cors(options);

// Handler explícito de preflight (OPTIONS)
export const preflight = cors(options);

export default corsMiddleware;
