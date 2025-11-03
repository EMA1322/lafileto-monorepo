// Controlador de ofertas
import { offerService } from '../services/offerService.js';
import { ok } from '../utils/envelope.js';

export const offersController = {
  list: async (req, res, next) => {
    try {
      const query = req.validated?.query ?? req.query ?? {};
      const { items, meta } = await offerService.listActiveOffers(query);
      return res.json(ok({ items, meta }));
    } catch (err) {
      next(err);
    }
  }
};
