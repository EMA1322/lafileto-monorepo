import { Router } from 'express';
import { settingsController } from '../controllers/settingsController.js';
import { authJWT } from '../middlewares/authJWT.js';
import { rbacGuard } from '../middlewares/rbacGuard.js';

export const settingsRoutes = Router();

settingsRoutes.get('/public', settingsController.getPublic);

settingsRoutes.get('/', authJWT(), rbacGuard('settings', 'r'), settingsController.getAdmin);
settingsRoutes.put('/', authJWT(), rbacGuard('settings', 'w'), settingsController.updateAdmin);
