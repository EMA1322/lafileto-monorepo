// Controlador Auth
import { authService } from '../services/authService.js';
import { ok } from '../utils/envelope.js';

export const authController = {
  // POST /auth/login
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const startedAt = Date.now();
      const debugMeta = {
        requestId: req.id,
        method: req.method,
        path: req.originalUrl,
        contentType: req.headers['content-type'],
        contentLength: req.headers['content-length'],
        bodyKeys: Object.keys(req.body || {})
      };
      // TODO: remove debug log (login instrumentation)
      console.info("[auth.login] start", { ...debugMeta, email });
      const data = await authService.login(email, password);
      // TODO: remove debug log (login instrumentation)
      console.info("[auth.login] success", {
        ...debugMeta,
        durationMs: Date.now() - startedAt,
        userId: data?.user?.id
      });
      return res.json(ok(data));
    } catch (err) {
      // TODO: remove debug log (login instrumentation)
      console.error("[auth.login] error", {
        requestId: req.id,
        error: err?.message,
        stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined
      });
      return next(err);
    }
  },

  // GET /auth/me
  me: async (req, res, next) => {
    try {
      const data = await authService.me(req.user.id);
      return res.json(ok(data));
    } catch (err) {
      return next(err);
    }
  }
};
