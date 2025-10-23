// Validadores Zod para categorías
import { z } from 'zod';

function toBooleanish(value) {
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0') return false;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'yes', 'on'].includes(normalized)) return true;
    if (['false', 'no', 'off'].includes(normalized)) return false;
  }
  return value;
}

const boolishOptional = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return undefined;
    return toBooleanish(value);
  },
  z.boolean().optional()
);

const nonEmptyString = z
  .string({ required_error: 'El nombre es obligatorio.' })
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres.')
  .max(50, 'El nombre es demasiado largo.');

const absoluteUrl = z
  .string()
  .trim()
  .min(1, 'La URL es obligatoria.')
  .max(2048, 'La URL es demasiado larga.')
  .url('La URL debe ser válida.')
  .refine((val) => {
    try {
      const parsed = new URL(val);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (_err) {
      return false;
    }
  }, { message: 'La URL debe ser absoluta (http/https).' });

function preprocessImageUrl(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return trimmed;
}

const optionalImageUrl = z.preprocess(
  preprocessImageUrl,
  z.union([absoluteUrl, z.null()]).optional()
);

function normalizeSearch(value) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeOrderBy(value) {
  if (!value) return 'name';
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'createdat' || normalized === 'created_at') return 'createdAt';
  return 'name';
}

function normalizeOrderDir(value) {
  if (!value) return 'asc';
  const normalized = String(value).trim().toLowerCase();
  return normalized === 'desc' ? 'desc' : 'asc';
}

export const categoryListQuerySchema = z.object({
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
    .transform(normalizeSearch),
  all: boolishOptional.transform((val) => val ?? false),
  orderBy: z
    .string()
    .optional()
    .transform(normalizeOrderBy),
  orderDir: z
    .string()
    .optional()
    .transform(normalizeOrderDir)
});

export const categoryCreateSchema = z.object({
  name: nonEmptyString,
  imageUrl: optionalImageUrl.transform((val) => (val === undefined ? null : val))
});

export const categoryUpdateSchema = z.object({
  name: nonEmptyString.optional(),
  imageUrl: optionalImageUrl,
  active: boolishOptional
});

export const categoryIdParamSchema = z.object({
  id: z
    .string({ required_error: 'Id requerido.' })
    .trim()
    .min(1, 'Id inválido.')
});
