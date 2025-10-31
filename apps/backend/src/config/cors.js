// Middleware CORS con allowlist configurable y defaults seguros para desarrollo
import cors from "cors";
import { env } from "./env.js";

const VITE_PORTS = new Set(["5173", "5174"]);

const LOCALHOST_ORIGINS = Array.from(VITE_PORTS).flatMap(port => [
  `http://localhost:${port}`,
  `http://127.0.0.1:${port}`
]);

const parseAllowlistCsv = csv =>
  (csv || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

const buildDefaultAllowlist = () => [...new Set(LOCALHOST_ORIGINS)];

const isPrivateLanOrigin = origin => {
  let url;
  try {
    url = new URL(origin);
  } catch (error) {
    return false;
  }

  if (url.protocol !== "http:") return false;
  if (!VITE_PORTS.has(url.port)) return false;

  const segments = url.hostname.split(".");
  if (segments.length !== 4) return false;

  const isValidOctet = value => {
    if (!/^\d+$/.test(value)) return false;
    const n = Number.parseInt(value, 10);
    return n >= 0 && n <= 255;
  };

  if (!segments.every(isValidOctet)) return false;

  const [a, b] = segments.map(Number);

  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;

  return false;
};

export const buildCorsOptions = () => {
  const originsFromEnv = parseAllowlistCsv(env.cors.allowlistCsv);
  const hasCustomAllowlist = originsFromEnv.length > 0;
  const allowlist = hasCustomAllowlist
    ? [...new Set(originsFromEnv)]
    : buildDefaultAllowlist();
  const allowlistSet = new Set(allowlist);
  const allowPrivateLanOrigins = !hasCustomAllowlist && env.nodeEnv === "development";

  return {
    origin(requestOrigin, cb) {
      if (!requestOrigin) return cb(null, true);

      const origin = requestOrigin.trim();
      if (!origin) return cb(null, true);

      if (allowlistSet.has(origin)) return cb(null, true);

      if (allowPrivateLanOrigins && isPrivateLanOrigin(origin)) return cb(null, true);

      cb(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    optionsSuccessStatus: 204
  };
};

// Exportamos el middleware listo para usar en Express.
export const corsMiddleware = cors(buildCorsOptions());

// Referencia rápida: si necesitás incluir una IP LAN fija, añadila a CORS_ALLOWLIST
// en tu .env, por ejemplo:
// CORS_ALLOWLIST=http://192.168.1.34:5174,http://localhost:5174
