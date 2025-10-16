// Controlador de usuarios (solo lectura)
import { userService } from '../services/userService.js';
import { ok } from '../utils/envelope.js';

export const userController = {
  list: async (req, res, next) => {
    try {
      const rawQuery = req.validated?.query ?? req.query ?? {};
      const query = typeof rawQuery === 'object' && rawQuery !== null ? { ...rawQuery } : {};
      const wantsAll = isAllRequested(query.all);
      const { items, meta } = await userService.listUsers({
        ...query,
        all: wantsAll
      });

      const payload = wantsAll ? { items } : { items, meta };
      return res.json(ok(payload));
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

function isAllRequested(value) {
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0') return false;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === 'yes' || normalized === 'on';
  }
  return false;
}
