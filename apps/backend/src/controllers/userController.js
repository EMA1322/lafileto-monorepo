// Controlador de usuarios (solo lectura)
import { userService } from '../services/userService.js';
import { ok } from '../utils/envelope.js';

export const userController = {
  list: async (req, res, next) => {
    try {
      const { items, meta } = await userService.listUsers(req.query);
      return res.json(ok({ items, meta }));
    } catch (err) {
      next(err);
    }
  }
};
