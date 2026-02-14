import { settingsService } from '../services/settingsService.js';
import { validateAndSanitizeSiteConfig } from '../settings/siteConfigValidator.js';
import { ok } from '../utils/envelope.js';
import { createError } from '../utils/errors.js';

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
      const { sanitized, errors } = validateAndSanitizeSiteConfig(req.body);

      if (errors.length) {
        throw createError('BAD_REQUEST', 'Datos inválidos.', {
          fields: errors
        });
      }

      const data = await settingsService.updateAdminSettings(sanitized, req.user?.id);
      return res.json(ok(data));
    } catch (err) {
      return next(err);
    }
  }
};
