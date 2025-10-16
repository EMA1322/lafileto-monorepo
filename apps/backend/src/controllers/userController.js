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
  },

  create: async (req, res, next) => {
    try {
      const user = await userService.createUser(req.body);
      return res.status(201).json(ok(user));
    } catch (err) {
      next(err);
    }
  },

  update: async (req, res, next) => {
    try {
      const user = await userService.updateUser(req.params.id, req.body);
      return res.json(ok(user));
    } catch (err) {
      next(err);
    }
  },

  remove: async (req, res, next) => {
    try {
      const result = await userService.deleteUser(req.params.id, {
        currentUserId: req.user?.id
      });
      return res.json(ok(result));
    } catch (err) {
      next(err);
    }
  }
};
