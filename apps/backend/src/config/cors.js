// Middleware CORS con allowlist desde .env
import cors from "cors";
import { env } from "./env.js";

export const corsMiddleware = cors({
  origin(origin, cb) {
    // Permite requests sin 'origin' (curl/Postman) y los orígenes de la allowlist
    if (!origin || env.cors.allowlist.includes(origin)) return cb(null, true);
    cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"]
});
