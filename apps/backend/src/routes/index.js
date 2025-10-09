// Router raíz v1: health + demo de login con rate limit
import { Router } from "express";
import { loginLimiter } from "../middlewares/rateLimiterLogin.js";

export const router = Router();

// Bienvenida
router.get("/", (_req, res) => {
  res.json({ ok: true, data: { service: "La Fileto API", status: "running" } });
});

// Healthcheck
router.get("/health", (_req, res) => {
  res.json({ ok: true, data: { status: "healthy", ts: new Date().toISOString() } });
});

// Stub temporal de login (reemplazar por tu controlador real)
router.post("/auth/login", loginLimiter, (req, res) => {
  res.status(501).json({
    ok: false,
    error: { code: "NOT_IMPLEMENTED", message: "Login estará disponible en I1-ENDPOINTS." }
  });
});

// Aquí colgarás tus routers reales, p. ej.:
// router.use("/products", productsRouter);
// router.use("/categories", categoriesRouter);
// router.use("/settings", settingsRouter);




