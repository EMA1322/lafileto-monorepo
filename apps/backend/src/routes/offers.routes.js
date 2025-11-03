// Router de ofertas (/api/v1/offers)
import { Router } from 'express';
import { offersController } from '../controllers/offersController.js';
import { productListQuerySchema } from '../validators/productValidators.js';
import { validator } from '../middlewares/validator.js';
import { authJWT } from '../middlewares/authJWT.js';
import { rbacGuard } from '../middlewares/rbacGuard.js';

export const offersRoutes = Router();

offersRoutes.get(
  '/',
  authJWT(),
  rbacGuard('offers', 'r'),
  validator(productListQuerySchema, 'query'),
  offersController.list
);
