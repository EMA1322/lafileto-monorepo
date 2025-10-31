// Middleware CORS con allowlist configurable y defaults seguros para desarrollo
import cors from "cors";
import { env } from "./env.js";

const VITE_PORTS = new Set(["5173", "5174"]);

const LOCALHOST_ORIGINS = Array.from(VITE_PORTS).flatMap(port => [
  `http://localhost:${port}`,
  `http://127.0.0.1:${port}`
]);

const defaultLogger = {
  info: (...args) => console.info(...args),
  debug: (...args) => console.debug(...args)
};

const normalizeOrigin = value => {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    return url.origin;
  } catch (error) {
    return trimmed.replace(/\/+$/, "");
  }
};

const parseAllowlistCsv = csv => {
  const uniqueOrigins = new Set();

  (csv || "")
    .split(",")
    .map(item => normalizeOrigin(item))
    .filter(Boolean)
    .forEach(origin => uniqueOrigins.add(origin));

  return [...uniqueOrigins];
};

const buildDefaultAllowlist = nodeEnv => {
  if (nodeEnv !== "development") return [];
  return [...new Set(LOCALHOST_ORIGINS)];
};

const formatAllowlistForLog = allowlist =>
  allowlist.length > 0 ? allowlist.join(", ") : "(empty)";

export const buildCorsOptions = ({
  allowlistCsv = env.cors.allowlistCsv,
  nodeEnv = env.nodeEnv,
  logger = defaultLogger
} = {}) => {
  const originsFromEnv = parseAllowlistCsv(allowlistCsv);
  const allowlist = originsFromEnv.length > 0
    ? originsFromEnv
    : buildDefaultAllowlist(nodeEnv);
  const allowlistSet = new Set(allowlist);

  if (nodeEnv === "development" && logger?.info) {
    logger.info(`[cors] allowlist: ${formatAllowlistForLog(allowlist)}`);
  }

  const originValidator = (requestOrigin, cb) => {
    if (!requestOrigin) return cb(null, true);

    const normalizedOrigin = normalizeOrigin(requestOrigin);
    if (!normalizedOrigin) return cb(null, true);

    if (allowlistSet.has(normalizedOrigin)) {
      return cb(null, true);
    }

    if (logger?.debug) {
      logger.debug(
        `[cors] blocked origin ${requestOrigin}. allowlist=${JSON.stringify([
          ...allowlistSet
        ])}`
      );
    }

    cb(new Error(`Not allowed by CORS: ${requestOrigin}`));
  };

  return {
    allowlist,
    options: {
      origin: originValidator,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      optionsSuccessStatus: 204
    }
  };
};

const { allowlist: cachedAllowlist, options: corsOptions } = buildCorsOptions();

export const getCorsAllowlist = () => [...cachedAllowlist];

// Exportamos el middleware listo para usar en Express.
export const corsMiddleware = cors(corsOptions);

// Referencia rápida: si necesitás incluir una IP LAN fija, añadila a CORS_ALLOWLIST
// en tu .env, por ejemplo:
// CORS_ALLOWLIST=http://192.168.1.34:5174,http://localhost:5174
