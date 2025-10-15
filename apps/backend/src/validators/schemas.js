import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email inválido.'),
  password: z.string().min(1, 'La contraseña es obligatoria.')
});

export const roleIdParamSchema = z.object({
  roleId: z.string().min(3).max(50)
});

const boolish = z.any().transform((value) => {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return false;
});

const permissionEntrySchema = z
  .object({
    moduleKey: z.string().trim().min(1, 'moduleKey requerido'),
    r: boolish.optional().transform((val) => (val === undefined ? false : val)),
    w: boolish.optional().transform((val) => (val === undefined ? false : val)),
    u: boolish.optional().transform((val) => (val === undefined ? false : val)),
    d: boolish.optional().transform((val) => (val === undefined ? false : val))
  })
  .transform((entry) => ({
    moduleKey: entry.moduleKey,
    r: entry.r,
    w: entry.w,
    u: entry.u,
    d: entry.d
  }));

export const rolePermissionsUpdateSchema = z.object({
  permissions: z.array(permissionEntrySchema).optional().transform((val) => val ?? [])
});
