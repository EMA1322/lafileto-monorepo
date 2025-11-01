// Middleware CORS con allowlist desde .env
import cors from "cors";
import { env } from "./env.js";

export function buildCorsOptions(allowlistInput = env.cors.allowlist) {
  const normalizedAllowlist = Array.isArray(allowlistInput)
    ? allowlistInput
    : String(allowlistInput ?? "")
        .split(",")
        .map(origin => origin.trim())
        .filter(Boolean);

  // Convertimos la allowlist en un Set para búsquedas O(1) y evitar duplicados.
  const allowlist = new Set(normalizedAllowlist);

  return {
    origin(origin, cb) {
      // Permitimos peticiones sin origin (curl/Postman) y sólo los orígenes confiables.
      if (!origin || allowlist.has(origin)) return cb(null, true);
      cb(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    // Declaramos los headers habituales para JSON + Auth; cubre el preflight completo.
    allowedHeaders: ["Content-Type", "Authorization"],
  };
}

export const corsMiddleware = cors(buildCorsOptions());
