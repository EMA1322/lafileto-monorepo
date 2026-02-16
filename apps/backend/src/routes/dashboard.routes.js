import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController.js';
import { authJWT } from '../middlewares/authJWT.js';
import { rbacGuard } from '../middlewares/rbacGuard.js';

export const dashboardRoutes = Router();

dashboardRoutes.get('/summary', authJWT(), rbacGuard('dashboard', 'r'), dashboardController.getSummary);
