// Router de ofertas (/api/v1/offers)
import { Router } from 'express';
import { offersController } from '../controllers/offersController.js';
import {
  offerCreateSchema,
  offerIdParamSchema,
  offerListQuerySchema,
  offerUpdateSchema
} from '../validators/offerValidators.js';
import { validator } from '../middlewares/validator.js';
import { authJWT } from '../middlewares/authJWT.js';
import { rbacGuard } from '../middlewares/rbacGuard.js';

export const offersRoutes = Router();

offersRoutes.get(
  '/',
  authJWT(),
  rbacGuard('offers', 'r'),
  validator(offerListQuerySchema, 'query'),
  offersController.list
);

offersRoutes.post(
  '/',
  authJWT(),
  rbacGuard('offers', 'w'),
  validator(offerCreateSchema),
  offersController.create
);

offersRoutes.put(
  '/:id',
  authJWT(),
  rbacGuard('offers', 'u'),
  validator(offerIdParamSchema, 'params'),
  validator(offerUpdateSchema),
  offersController.update
);

offersRoutes.delete(
  '/:id',
  authJWT(),
  rbacGuard('offers', 'd'),
  validator(offerIdParamSchema, 'params'),
  offersController.remove
);
