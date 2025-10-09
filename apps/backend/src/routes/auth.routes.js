import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { validator } from '../middlewares/validator.js';
import { loginSchema } from '../validators/schemas.js';
import { rateLimiterLogin } from '../middlewares/rateLimiterLogin.js';
import { authJWT } from '../middlewares/authJWT.js';

export const authRoutes = Router();

// POST /auth/login (rate-limited + validate)
authRoutes.post('/login', rateLimiterLogin, validator(loginSchema), authController.login);

// GET /auth/me (requiere JWT)
authRoutes.get('/me', authJWT(), authController.me);
