// debug.routes.js
// Router de diagnóstico de desarrollo (no usar en producción)
import { Router } from 'express';

const router = Router();

/**
 * GET /_debug/ping
 * Responde con envelope ok:true para validar conectividad y middlewares.
 */
router.get('/ping', (req, res) => {
  // Nota: mantener el envelope estándar del proyecto
  res.json({
    ok: true,
    data: {
      ts: Date.now(), // timestamp de verificación
      requestId: req.id ?? null, // si tu middleware requestId setea req.id
      env: process.env.NODE_ENV || 'development',
    },
  });
});

export default router;
