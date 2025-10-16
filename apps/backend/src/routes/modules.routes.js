import { Router } from 'express';
import { rbacController } from '../controllers/rbacController.js';
import { authJWT } from '../middlewares/authJWT.js';
import { requireAdminRole } from '../middlewares/requireAdminRole.js';

export const modulesRoutes = Router();

modulesRoutes.use(authJWT());
modulesRoutes.use(requireAdminRole());

modulesRoutes.get('/', rbacController.listModules);
