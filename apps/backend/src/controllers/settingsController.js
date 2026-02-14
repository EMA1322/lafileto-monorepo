import { settingsService } from '../services/settingsService.js';
import { ok } from '../utils/envelope.js';

export const settingsController = {
  getAdmin: async (_req, res, next) => {
    try {
      const data = await settingsService.getAdminSettings();
      return res.json(ok(data));
    } catch (err) {
      return next(err);
    }
  },

  getPublic: async (_req, res, next) => {
    try {
      const data = await settingsService.getPublicSettings();
      return res.json(ok(data));
    } catch (err) {
      return next(err);
    }
  },

  updateAdmin: async (req, res, next) => {
    try {
      const data = await settingsService.updateAdminSettings(req.body, req.user?.id);
      return res.json(ok(data));
    } catch (err) {
      return next(err);
    }
  }
};
