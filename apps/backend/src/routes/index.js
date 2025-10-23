// Router raíz v1: health y módulos reales (auth, users, roles, modules)
import { Router } from "express";
import { authRoutes } from "./auth.routes.js";
import { usersRoutes } from "./users.routes.js";
import { rolesRoutes } from "./roles.routes.js";
import { modulesRoutes } from "./modules.routes.js";
import { categoriesRoutes } from "../modules/categories/category.routes.js";

export const router = Router();

// Bienvenida
router.get("/", (_req, res) => {
  res.json({ ok: true, data: { service: "La Fileto API", status: "running" } });
});

// Healthcheck
router.get("/health", (_req, res) => {
  res.json({ ok: true, data: { status: "healthy", ts: new Date().toISOString() } });
});

if (process.env.NODE_ENV !== "production") {
  // Endpoint de salud en dev para validar que el proxy llega al backend.
  router.get("/_debug/ping", (_req, res) => {
    res.json({ ok: true, ts: new Date().toISOString() });
  });
}

// Routers reales bajo /api/v1
router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/roles", rolesRoutes);
router.use("/modules", modulesRoutes);
router.use("/categories", categoriesRoutes);




