// Carga de variables de entorno con defaults seguros (comentarios en español; código en inglés)
import dotenv from 'dotenv';
dotenv.config();

const toNumber = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const requireString = (value, name) => {
  const trimmed = (value ?? '').trim();
  if (!trimmed) {
    // Fallar temprano para evitar levantar el servidor sin credenciales JWT.
    throw new Error(`[env] Missing required environment variable ${name}`);
  }
  return trimmed;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toNumber(process.env.PORT, 3000),
  limits: {
    bodyLimit: process.env.BODY_LIMIT || '1mb',
    requestTimeoutMs: toNumber(process.env.REQUEST_TIMEOUT_MS, 15000),
  },
  cors: {
    allowlist: (process.env.CORS_ALLOWLIST || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },
  jwt: {
    secret: requireString(process.env.JWT_SECRET, 'JWT_SECRET'),
    expiresIn: (process.env.JWT_EXPIRES_IN || '1d').trim() || '1d',
  },
};

// 👇 ESTA LÍNEA ES LA CLAVE
export default env;
