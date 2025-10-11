// Utilidades JWT: firmar payload y construir permisos efectivos
import { env } from "../config/env.js";

let jwtModulePromise;

const getJwt = async () => {
  if (!jwtModulePromise) {
    // Lazy load: evita romper el arranque si falta la dependencia y da un mensaje claro.
    jwtModulePromise = import("jsonwebtoken")
      .then(mod => mod.default || mod)
      .catch(error => {
        error.message = 'Missing dependency jsonwebtoken: run "pnpm install" in apps/backend.';
        throw error;
      });
  }
  return jwtModulePromise;
};

export async function signJwt(payload) {
  const jwt = await getJwt();
  // Firma con expiración configurada
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}

export async function verifyJwt(token) {
  const jwt = await getJwt();
  // Centralizamos verify para reutilizar la misma configuración y manejo de errores.
  return jwt.verify(token, env.jwt.secret);
}
