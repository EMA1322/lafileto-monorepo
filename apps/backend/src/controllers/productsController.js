// Controlador de productos
import { productService } from '../services/productService.js';
import { ok } from '../utils/envelope.js';

const stripLegacyProductFields = (data) => {
  if (!data || typeof data !== 'object') return {};
  const { slug: _slug, sku: _sku, currency: _currency, isFeatured: _isFeatured, ...rest } = data;
  return rest;
};

export const productsController = {
  list: async (req, res, next) => {
    try {
      const query = req.validated?.query ?? {};
      const { items, meta } = await productService.listProducts(query);
      return res.json(ok({ items, meta }));
    } catch (err) {
      next(err);
    }
  },

  show: async (req, res, next) => {
    try {
      const params = req.validated?.params ?? req.params ?? {};
      const product = await productService.getProduct(params.id ?? req.params.id);
      return res.json(ok(product));
    } catch (err) {
      next(err);
    }
  },

  create: async (req, res, next) => {
    try {
      const body = stripLegacyProductFields(req.validated?.body ?? req.body ?? {});
      const product = await productService.createProduct(body);
      return res.status(201).json(ok(product));
    } catch (err) {
      next(err);
    }
  },

  update: async (req, res, next) => {
    try {
      const params = req.validated?.params ?? req.params ?? {};
      const body = stripLegacyProductFields(req.validated?.body ?? req.body ?? {});
      const product = await productService.updateProduct(params.id ?? req.params.id, body);
      return res.json(ok(product));
    } catch (err) {
      next(err);
    }
  },

  changeStatus: async (req, res, next) => {
    try {
      const params = req.validated?.params ?? req.params ?? {};
      const body = req.validated?.body ?? req.body ?? {};
      const product = await productService.changeProductStatus(params.id ?? req.params.id, body.status);
      return res.json(ok(product));
    } catch (err) {
      next(err);
    }
  },

  remove: async (req, res, next) => {
    try {
      const params = req.validated?.params ?? req.params ?? {};
      const result = await productService.deleteProduct(params.id ?? req.params.id);
      return res.json(ok(result));
    } catch (err) {
      next(err);
    }
  }
};
