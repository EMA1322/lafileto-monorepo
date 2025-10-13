// Router raíz v1: health y módulos reales (auth, rbac)
import { Router } from "express";
import { authRoutes } from "./auth.routes.js";
import { rbacRoutes } from "./rbac.routes.js";

export const router = Router();

// Bienvenida
router.get("/", (_req, res) => {
  res.json({ ok: true, data: { service: "La Fileto API", status: "running" } });
});

// Healthcheck
router.get("/health", (_req, res) => {
  res.json({ ok: true, data: { status: "healthy", ts: new Date().toISOString() } });
});

// Ping rápido para diagnósticos
router.get("/_debug/ping", (_req, res) => {
  res.json({ ok: true, data: { ts: new Date().toISOString() } });
});

// Routers reales bajo /api/v1
router.use("/auth", authRoutes);
router.use("/rbac", rbacRoutes);




