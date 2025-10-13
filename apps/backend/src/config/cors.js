// Middleware CORS con allowlist desde .env
import cors from "cors";
import { env } from "./env.js";

// Convertimos la allowlist en un Set para búsquedas O(1) y evitar duplicados.
const allowlist = new Set(env.cors.allowlist);

export const corsMiddleware = cors({
  origin(origin, cb) {
    // Permitimos peticiones sin origin (curl/Postman) y sólo los orígenes confiables.
    if (!origin || allowlist.has(origin)) return cb(null, true);
    cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  // Declaramos los headers habituales para JSON + Auth; cubre el preflight completo.
  allowedHeaders: ["Content-Type", "Authorization"]
});
