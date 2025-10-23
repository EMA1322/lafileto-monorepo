// Router de categorías (/api/v1/categories)
import { Router } from 'express';
import { categoryController } from './category.controller.js';
import {
  categoryCreateSchema,
  categoryIdParamSchema,
  categoryListQuerySchema,
  categoryUpdateSchema
} from './category.validators.js';
import { validator } from '../../middlewares/validator.js';
import { authJWT } from '../../middlewares/authJWT.js';
import { rbacGuard } from '../../middlewares/rbacGuard.js';

export const categoriesRoutes = Router();

categoriesRoutes.get('/', validator(categoryListQuerySchema, 'query'), categoryController.list);

categoriesRoutes.post(
  '/',
  authJWT(),
  rbacGuard('categories', 'w', { errorCode: 'RBAC_FORBIDDEN' }),
  validator(categoryCreateSchema),
  categoryController.create
);

categoriesRoutes.patch(
  '/:id',
  authJWT(),
  rbacGuard('categories', 'u', { errorCode: 'RBAC_FORBIDDEN' }),
  validator(categoryIdParamSchema, 'params'),
  validator(categoryUpdateSchema),
  categoryController.update
);

categoriesRoutes.delete(
  '/:id',
  authJWT(),
  rbacGuard('categories', 'd', { errorCode: 'RBAC_FORBIDDEN' }),
  validator(categoryIdParamSchema, 'params'),
  categoryController.remove
);
