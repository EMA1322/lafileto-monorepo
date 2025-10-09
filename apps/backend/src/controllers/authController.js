// Controlador Auth
import { authService } from '../services/authService.js';
import { ok } from '../utils/envelope.js';

export const authController = {
  // POST /auth/login
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const data = await authService.login(email, password);
      return res.json(ok(data));
    } catch (err) {
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
