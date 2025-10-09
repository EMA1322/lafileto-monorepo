// Carga de variables de entorno con defaults seguros (comentarios en español; código en inglés)
import dotenv from "dotenv";
dotenv.config();

const toNumber = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toNumber(process.env.PORT, 3000),
  limits: {
    bodyLimit: process.env.BODY_LIMIT || "1mb",
    requestTimeoutMs: toNumber(process.env.REQUEST_TIMEOUT_MS, 15000)
  },
  cors: {
    allowlist: (process.env.CORS_ALLOWLIST || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
  }
};
