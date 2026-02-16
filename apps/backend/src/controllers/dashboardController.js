import { dashboardService } from '../services/dashboardService.js';
import { ok } from '../utils/envelope.js';

export const dashboardController = {
  getSummary: async (_req, res, next) => {
    try {
      const data = await dashboardService.getAdminSummary();
      return res.json(ok(data));
    } catch (err) {
      return next(err);
    }
  }
};
