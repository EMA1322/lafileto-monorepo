// Router de productos (/api/v1/products)
import { Router } from 'express';
import { productsController } from '../controllers/productsController.js';
import {
  productCreateSchema,
  productIdParamSchema,
  productListQuerySchema,
  productStatusSchema,
  productUpdateSchema
} from '../validators/productValidators.js';
import { validator } from '../middlewares/validator.js';
import { authJWT } from '../middlewares/authJWT.js';
import { rbacGuard } from '../middlewares/rbacGuard.js';

export const productsRoutes = Router();

productsRoutes.get(
  '/',
  authJWT(),
  rbacGuard('products', 'r'),
  validator(productListQuerySchema, 'query'),
  productsController.list
);

productsRoutes.get(
  '/:id',
  authJWT(),
  rbacGuard('products', 'r'),
  validator(productIdParamSchema, 'params'),
  productsController.show
);

productsRoutes.post(
  '/',
  authJWT(),
  rbacGuard('products', 'w'),
  validator(productCreateSchema),
  productsController.create
);

productsRoutes.put(
  '/:id',
  authJWT(),
  rbacGuard('products', 'u'),
  validator(productIdParamSchema, 'params'),
  validator(productUpdateSchema),
  productsController.update
);

productsRoutes.patch(
  '/:id/status',
  authJWT(),
  rbacGuard('products', 'changeStatus'),
  validator(productIdParamSchema, 'params'),
  validator(productStatusSchema),
  productsController.changeStatus
);

productsRoutes.delete(
  '/:id',
  authJWT(),
  rbacGuard('products', 'd'),
  validator(productIdParamSchema, 'params'),
  productsController.remove
);
