import { publicCatalogService } from '../services/publicCatalogService.js';
import { ok } from '../utils/envelope.js';

export const publicController = {
  listProducts: async (_req, res, next) => {
    try {
      const items = await publicCatalogService.listProducts();
      return res.json(ok(items, { total: items.length }));
    } catch (err) {
      return next(err);
    }
  },

  listCategories: async (_req, res, next) => {
    try {
      const items = await publicCatalogService.listCategories();
      return res.json(ok(items, { total: items.length }));
    } catch (err) {
      return next(err);
    }
  },

  listOffers: async (_req, res, next) => {
    try {
      const items = await publicCatalogService.listOffers();
      return res.json(ok(items, { total: items.length }));
    } catch (err) {
      return next(err);
    }
  },

  getSettings: async (_req, res, next) => {
    try {
      const data = await publicCatalogService.getPublicSettings();
      return res.json(ok(data));
    } catch (err) {
      return next(err);
    }
  },

  getBusinessStatus: async (_req, res, next) => {
    try {
      const data = await publicCatalogService.getBusinessStatus();
      return res.json(ok(data));
    } catch (err) {
      return next(err);
    }
  },

  getCommercialConfig: async (_req, res, next) => {
    try {
      const data = await publicCatalogService.getCommercialConfig();
      return res.json(ok(data));
    } catch (err) {
      return next(err);
    }
  }
};
