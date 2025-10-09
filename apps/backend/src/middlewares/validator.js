// Adaptador de validación con Zod para body/query/params
// Uso: router.post('/auth/login', validator(loginSchema), controller)
import { ZodError } from 'zod';
import { createError } from '../utils/errors.js';

export function validator(zodSchema, where = 'body') {
  return (req, _res, next) => {
    try {
      const data =
        where === 'query' ? req.query :
        where === 'params' ? req.params :
        req.body;

      const parsed = zodSchema.parse(data);
      if (where === 'query') req.query = parsed;
      else if (where === 'params') req.params = parsed;
      else req.body = parsed;

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const fields = err.issues.map(i => ({
          path: (i.path && i.path.length ? i.path.join('.') : '_'),
          message: i.message,
          code: i.code
        }));
        return next(createError('VALIDATION_ERROR', 'Datos inválidos.', { fields }));
      }
      return next(err);
    }
  };
}
