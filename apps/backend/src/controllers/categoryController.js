// Controlador de categorías
import { categoryService } from '../services/categoryService.js';
import { ok } from '../utils/envelope.js';

export const categoryController = {
  list: async (req, res, next) => {
    try {
      const query = req.validated?.query ?? {};
      const wantsAll = !!query.all;
      const { items, meta } = await categoryService.listCategories(query);
      const payload = wantsAll ? { items } : { items, meta };
      return res.json(ok(payload));
    } catch (err) {
      next(err);
    }
  },

  show: async (req, res, next) => {
    try {
      const params = req.validated?.params ?? req.params ?? {};
      const category = await categoryService.getCategory(params.id ?? req.params.id);
      return res.json(ok(category));
    } catch (err) {
      next(err);
    }
  },

  create: async (req, res, next) => {
    try {
      const body = req.validated?.body ?? req.body ?? {};
      const category = await categoryService.createCategory(body);
      return res.status(201).json(ok(category));
    } catch (err) {
      next(err);
    }
  },

  update: async (req, res, next) => {
    try {
      const params = req.validated?.params ?? req.params ?? {};
      const body = req.validated?.body ?? req.body ?? {};
      const category = await categoryService.updateCategory(params.id ?? req.params.id, body);
      return res.json(ok(category));
    } catch (err) {
      next(err);
    }
  },

  toggle: async (req, res, next) => {
    try {
      const params = req.validated?.params ?? req.params ?? {};
      const body = req.validated?.body ?? req.body ?? {};
      const category = await categoryService.toggleCategoryActive(
        params.id ?? req.params.id,
        body.active
      );
      return res.json(ok(category));
    } catch (err) {
      next(err);
    }
  },

  remove: async (req, res, next) => {
    try {
      const params = req.validated?.params ?? req.params ?? {};
      const result = await categoryService.deleteCategory(params.id ?? req.params.id);
      return res.json(ok(result));
    } catch (err) {
      next(err);
    }
  }
};
