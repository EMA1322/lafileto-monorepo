import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { authJWT } from '../middlewares/authJWT.js';
import { requireAdminRole } from '../middlewares/requireAdminRole.js';
import { validator } from '../middlewares/validator.js';
import {
  userCreateSchema,
  userUpdateSchema,
  userListQuerySchema,
  userIdParamSchema
} from '../validators/schemas.js';

export const usersRoutes = Router();

usersRoutes.use(authJWT());
usersRoutes.use(requireAdminRole());

usersRoutes.get('/', validator(userListQuerySchema, 'query'), userController.list);
usersRoutes.post('/', validator(userCreateSchema), userController.create);
usersRoutes.put(
  '/:id',
  validator(userIdParamSchema, 'params'),
  validator(userUpdateSchema),
  userController.update
);
usersRoutes.delete(
  '/:id',
  validator(userIdParamSchema, 'params'),
  userController.remove
);
