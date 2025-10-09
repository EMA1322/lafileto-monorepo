// Zod schemas para I1
import { z } from 'zod';


export const loginSchema = z.object({
  email: z.string().email('Email inválido.'),
  password: z.string().min(1, 'La contraseña es obligatoria.')
});
export const roleCreateSchema = z.object({
  roleId: z.string().min(3).max(50),
  name: z.string().min(3).max(100)
});
export const roleUpdateSchema = z.object({
  name: z.string().min(3).max(100)
});
export const roleIdParamSchema = z.object({
  roleId: z.string().min(3).max(50)
});


// --- Esquema tolerante para matriz de permisos ---
// Acepta objetos, convierte lo que venga (true/false, "true"/"false", 1/0, null/undefined)
// a booleanos puros y rellena faltantes con false.
// Rechaza únicamente el objeto vacío {}.
export const permissionsMatrixSchemaLoose = z.any().transform((input) => {
  const src = (input && typeof input === 'object') ? input : {};
  const out = {};
  for (const [mk, raw] of Object.entries(src)) {
    const v = (raw && typeof raw === 'object') ? raw : {};
    const toBool = (x) => {
      if (x === true || x === 'true' || x === 1) return true;
      return false;
    };
    out[mk] = {
      r: toBool(v.r),
      w: toBool(v.w),
      u: toBool(v.u),
      d: toBool(v.d)
    };
  }
  return out;
}).refine(obj => Object.keys(obj).length > 0, { message: 'Empty permissions matrix' });

// (Mantén también tu permissionsMatrixSchema “estricto” si lo quieres para otros usos)