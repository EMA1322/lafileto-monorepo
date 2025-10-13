import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { corsMiddleware } from "./config/cors.js";
import { requestId } from "./middlewares/requestId.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { router } from "./routes/index.js";

const app = express();

// Si vas a estar detrás de Nginx/Cloudflare en prod, descomenta:
// app.set("trust proxy", 1);

app.use(express.json({ limit: env.limits.bodyLimit }));
app.use(requestId());
// Registramos CORS antes de las rutas para que toda request pase por la allowlist.
app.use(corsMiddleware);
// Respuesta inmediata a preflight (OPTIONS) para cualquier endpoint.
app.options("*", corsMiddleware);
app.use(helmet());
app.use(morgan("dev"));

app.use("/api/v1", router);

// 404 para rutas desconocidas dentro de /api/v1
app.use("/api", (_req, res) =>
  res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Route not found" } })
);

// Manejador de errores final
app.use(errorHandler);

export default app;
