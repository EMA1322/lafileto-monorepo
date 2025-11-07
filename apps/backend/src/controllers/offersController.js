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
  },

  create: async (req, res, next) => {
    try {
      const body = req.validated?.body ?? req.body ?? {};
      const product = await offerService.createOffer(body);
      return res.status(201).json(ok(product));
    } catch (err) {
      next(err);
    }
  },

  update: async (req, res, next) => {
    try {
      const params = req.validated?.params ?? req.params ?? {};
      const body = req.validated?.body ?? req.body ?? {};
      const product = await offerService.updateOffer(params.id ?? req.params.id, body);
      return res.json(ok(product));
    } catch (err) {
      next(err);
    }
  },

  remove: async (req, res, next) => {
    try {
      const params = req.validated?.params ?? req.params ?? {};
      const product = await offerService.deleteOffer(params.id ?? req.params.id);
      return res.json(ok(product));
    } catch (err) {
      next(err);
    }
  }
};
