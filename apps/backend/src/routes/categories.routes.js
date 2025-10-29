// Router de categorías (/api/v1/categories)
import { Router } from 'express';
import { categoryController } from '../controllers/categoryController.js';
import {
  categoryCreateSchema,
  categoryIdParamSchema,
  categoryListQuerySchema,
  categoryToggleSchema,
  categoryUpdateSchema
} from '../validators/categoryValidators.js';
import { validator } from '../middlewares/validator.js';
import { authJWT } from '../middlewares/authJWT.js';
import { rbacGuard } from '../middlewares/rbacGuard.js';
import { requireAdminRole } from '../middlewares/requireAdminRole.js';

export const categoriesRoutes = Router();

categoriesRoutes.get(
  '/',
  authJWT(),
  requireAdminRole(),
  rbacGuard('categories', 'r', { errorCode: 'RBAC_FORBIDDEN' }),
  validator(categoryListQuerySchema, 'query'),
  categoryController.list
);

categoriesRoutes.get(
  '/:id',
  authJWT(),
  rbacGuard('categories', 'r', { errorCode: 'RBAC_FORBIDDEN' }),
  validator(categoryIdParamSchema, 'params'),
  categoryController.show
);

categoriesRoutes.post(
  '/',
  authJWT(),
  rbacGuard('categories', 'w', { errorCode: 'RBAC_FORBIDDEN' }),
  validator(categoryCreateSchema),
  categoryController.create
);

categoriesRoutes.put(
  '/:id',
  authJWT(),
  rbacGuard('categories', 'u', { errorCode: 'RBAC_FORBIDDEN' }),
  validator(categoryIdParamSchema, 'params'),
  validator(categoryUpdateSchema),
  categoryController.update
);

categoriesRoutes.patch(
  '/:id',
  authJWT(),
  rbacGuard('categories', 'u', { errorCode: 'RBAC_FORBIDDEN' }),
  validator(categoryIdParamSchema, 'params'),
  validator(categoryToggleSchema),
  categoryController.toggle
);

categoriesRoutes.delete(
  '/:id',
  authJWT(),
  rbacGuard('categories', 'd', { errorCode: 'RBAC_FORBIDDEN' }),
  validator(categoryIdParamSchema, 'params'),
  categoryController.remove
);
