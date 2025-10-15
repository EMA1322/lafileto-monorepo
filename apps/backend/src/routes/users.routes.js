import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { authJWT } from '../middlewares/authJWT.js';
import { requireAdminRole } from '../middlewares/requireAdminRole.js';

export const usersRoutes = Router();

usersRoutes.use(authJWT());
usersRoutes.use(requireAdminRole());

usersRoutes.get('/', userController.list);
