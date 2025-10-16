import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { authJWT } from '../middlewares/authJWT.js';
import { requireAdminRole } from '../middlewares/requireAdminRole.js';
import { validator } from '../middlewares/validator.js';
import { userCreateSchema } from '../validators/schemas.js';

export const usersRoutes = Router();

usersRoutes.use(authJWT());
usersRoutes.use(requireAdminRole());

usersRoutes.get('/', userController.list);
usersRoutes.post('/', validator(userCreateSchema), userController.create);
