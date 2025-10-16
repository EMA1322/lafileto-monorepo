import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email inválido.'),
  password: z.string().min(1, 'La contraseña es obligatoria.')
});

const roleIdNormalizer = z
  .string()
  .min(3)
  .max(50)
  .transform((val) => String(val || '').trim().toLowerCase());

export const roleIdParamSchema = z.object({
  roleId: roleIdNormalizer
});

const boolish = z.any().transform((value) => {
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0') return false;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === 'yes' || normalized === 'on') return true;
    if (normalized === 'false' || normalized === 'no' || normalized === 'off') return false;
  }
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

const PHONE_REGEX = /^[0-9()+\s-]{7,20}$/;

const statusSchema = z
  .string()
  .transform((val) => String(val || '').trim().toUpperCase())
  .refine((val) => val === 'ACTIVE' || val === 'INACTIVE', {
    message: 'Estado inválido.'
  });

const userIdParam = z
  .object({
    id: z
      .string()
      .trim()
      .regex(/^\d+$/, 'El identificador debe ser numérico.')
      .transform((val) => Number.parseInt(val, 10))
  })
  .transform((data) => ({ id: data.id }));

export const userIdParamSchema = userIdParam;

export const userListQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val, 10) : undefined))
    .refine((val) => val === undefined || (Number.isInteger(val) && val > 0), {
      message: 'page debe ser un entero positivo.'
    }),
  pageSize: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val, 10) : undefined))
    .refine((val) => val === undefined || (Number.isInteger(val) && val > 0), {
      message: 'pageSize debe ser un entero positivo.'
    }),
  search: z
    .string()
    .optional()
    .transform((val) => (typeof val === 'string' ? val.trim() : undefined)),
  all: z
    .any()
    .optional()
    .transform((value) => {
      if (value === undefined || value === null) return false;
      return boolish.parse(value);
    })
});

export const userCreateSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'El nombre completo debe tener al menos 2 caracteres.')
    .max(120, 'El nombre completo es demasiado largo.'),
  email: z
    .string()
    .trim()
    .min(1, 'El email es obligatorio.')
    .email('Email inválido.')
    .transform((val) => val.toLowerCase()),
  phone: z
    .string()
    .trim()
    .min(1, 'El teléfono es obligatorio.')
    .regex(PHONE_REGEX, 'Ingrese un teléfono válido (7-20 caracteres, solo dígitos y + () -).')
    .transform((val) => val.replace(/\s+/g, ' ').trim()),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  roleId: z
    .string()
    .trim()
    .min(3, 'El rol es obligatorio.')
    .max(50, 'El rol es demasiado largo.')
    .transform((val) => val.toLowerCase()),
  status: statusSchema.optional().default('ACTIVE')
});

export const userUpdateSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'El nombre completo debe tener al menos 2 caracteres.')
    .max(120, 'El nombre completo es demasiado largo.'),
  phone: z
    .string()
    .trim()
    .min(1, 'El teléfono es obligatorio.')
    .regex(PHONE_REGEX, 'Ingrese un teléfono válido (7-20 caracteres, solo dígitos y + () -).')
    .transform((val) => val.replace(/\s+/g, ' ').trim()),
  roleId: z
    .string()
    .trim()
    .min(3, 'El rol es obligatorio.')
    .max(50, 'El rol es demasiado largo.')
    .transform((val) => val.toLowerCase()),
  status: statusSchema
});

export const roleCreateSchema = z.object({
  roleId: z
    .string()
    .trim()
    .min(3, 'El identificador del rol es muy corto.')
    .max(50, 'El identificador del rol es muy largo.')
    .regex(/^role-[a-z0-9-]+$/i, 'El identificador debe comenzar con role- y usar letras, números o guiones.')
    .transform((val) => val.toLowerCase())
    .optional(),
  name: z
    .string()
    .trim()
    .min(2, 'El nombre es obligatorio.')
    .max(80, 'El nombre del rol es demasiado largo.')
});

export const roleUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El nombre es obligatorio.')
    .max(80, 'El nombre del rol es demasiado largo.')
});
