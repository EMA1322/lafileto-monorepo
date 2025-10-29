// Zod validators for categories module
import { z } from 'zod';

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

function positiveIntParam(fieldName) {
  return z
    .preprocess((value) => {
      if (value === undefined || value === null || value === '') return undefined;
      if (typeof value === 'number') return value;
      return Number.parseInt(String(value), 10);
    }, z.number().int().positive().optional())
    .refine((val) => val === undefined || (Number.isInteger(val) && val > 0), {
      message: `${fieldName} debe ser un entero positivo.`
    });
}

function normalizeQuery(value) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeStatus(value) {
  if (typeof value !== 'string') return 'active';
  const normalized = value.trim().toLowerCase();
  if (normalized === 'inactive') return 'inactive';
  if (normalized === 'all') return 'all';
  return 'active';
}

function normalizeOrderBy(value) {
  if (typeof value !== 'string') return 'name';
  const normalized = value.trim().toLowerCase();
  if (normalized === 'createdat' || normalized === 'created_at') return 'createdAt';
  if (normalized === 'name') return 'name';
  return 'name';
}

function normalizeOrderDir(value) {
  if (typeof value !== 'string') return 'asc';
  const normalized = value.trim().toLowerCase();
  return normalized === 'desc' ? 'desc' : 'asc';
}

export const categoryListQuerySchema = z.object({
  q: z
    .string()
    .optional()
    .transform(normalizeQuery),
  status: z
    .string()
    .optional()
    .transform(normalizeStatus),
  orderBy: z
    .string()
    .optional()
    .transform(normalizeOrderBy),
  orderDir: z
    .string()
    .optional()
    .transform(normalizeOrderDir),
  page: positiveIntParam('page'),
  pageSize: positiveIntParam('pageSize')
});

export const categoryCreateSchema = z.object({
  name: nonEmptyString,
  imageUrl: optionalImageUrl.transform((val) => (val === undefined ? null : val))
});

export const categoryUpdateSchema = z.object({
  name: nonEmptyString.optional(),
  imageUrl: optionalImageUrl
});

export const categoryToggleSchema = z.object({
  active: z
    .preprocess((value) => {
      if (value === 'true' || value === '1') return true;
      if (value === 'false' || value === '0') return false;
      return value;
    }, z.boolean({ required_error: 'active es requerido.' }))
});

export const categoryIdParamSchema = z.object({
  id: z
    .string({ required_error: 'Id requerido.' })
    .trim()
    .min(1, 'Id inválido.')
});
