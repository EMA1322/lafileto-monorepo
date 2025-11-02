// Controlador de usuarios (solo lectura)
import { userService } from '../services/userService.js';
import { ok } from '../utils/envelope.js';

export const userController = {
  list: async (req, res, next) => {
    try {
      const query = req.validated?.query ?? req.query ?? {};
      const { items, meta } = await userService.listUsers(query);
      return res.json(ok({ items, meta }));
    } catch (err) {
      next(err);
    }
  },

  create: async (req, res, next) => {
    try {
      const body = req.validated?.body ?? req.body ?? {};
      const user = await userService.createUser(body);
      return res.status(201).json(ok(user));
    } catch (err) {
      next(err);
    }
  },

  update: async (req, res, next) => {
    try {
      const params = req.validated?.params ?? req.params ?? {};
      const body = req.validated?.body ?? req.body ?? {};
      const user = await userService.updateUser(params.id ?? req.params.id, body);
      return res.json(ok(user));
    } catch (err) {
      next(err);
    }
  },

  remove: async (req, res, next) => {
    try {
      const params = req.validated?.params ?? req.params ?? {};
      const result = await userService.deleteUser(params.id ?? req.params.id, {
        currentUserId: req.user?.id
      });
      return res.json(ok(result));
    } catch (err) {
      next(err);
    }
  }
};
