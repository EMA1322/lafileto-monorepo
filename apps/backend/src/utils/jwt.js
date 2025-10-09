// Utilidades JWT: firmar payload y construir permisos efectivos
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signJwt(payload) {
  // Firma con expiración configurada
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}
