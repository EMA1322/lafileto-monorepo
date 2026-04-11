import { Router } from 'express';
import { publicController } from '../controllers/publicController.js';

export const publicRoutes = Router();

publicRoutes.get('/products', publicController.listProducts);
publicRoutes.get('/categories', publicController.listCategories);
publicRoutes.get('/offers', publicController.listOffers);
publicRoutes.get('/settings', publicController.getSettings);
publicRoutes.get('/business-status', publicController.getBusinessStatus);
publicRoutes.get('/commercial-config', publicController.getCommercialConfig);
