// Adaptador de validación con Zod para body/query/params
// Uso: router.post('/auth/login', validator(loginSchema), controller)
import { ZodError } from 'zod';
import { createError } from '../utils/errors.js';

export function validator(zodSchema, where = 'body') {
  return (req, _res, next) => {
    try {
      // Clonamos los datos originales según la fuente a validar para evitar
      // modificar directamente los objetos que expone el router (tienen solo getters).
      const source =
        where === 'query'
          ? Object.assign({}, req.query || {})
          : where === 'params'
          ? Object.assign({}, req.params || {})
          : typeof req.body === 'object' && req.body !== null
          ? { ...req.body }
          : {};

      const parsed = zodSchema.parse(source);

      // Guardamos los datos validados en req.validated sin tocar req.query/params/body.
      if (!req.validated) {
        req.validated = {};
      }

      if (where === 'query') {
        req.validated.query = parsed;
      } else if (where === 'params') {
        req.validated.params = parsed;
      } else {
        req.validated.body = parsed;
      }

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const fields = err.issues.map((issue) => ({
          path: issue.path && issue.path.length ? issue.path.join('.') : '_',
          message: issue.message,
          code: issue.code
        }));
        return next(createError('VALIDATION_ERROR', 'Datos inválidos.', { fields }));
      }
      return next(err);
    }
  };
}
