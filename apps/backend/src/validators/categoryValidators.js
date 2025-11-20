// Validadores Zod para categorías
import { z } from 'zod';

import { toBooleanish } from '../utils/formatters.js';

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
    } catch {
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

const statusParam = z
  .preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    const normalized = String(value).trim().toLowerCase();
    return normalized.length > 0 ? normalized : undefined;
  }, z.enum(['all', 'active', 'inactive']).optional())
  .transform((val) => val ?? 'all');

const pageParam = z
  .preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : value;
  }, z.number().int().min(1, 'Debe ser un entero positivo.').optional())
  .transform((val) => val ?? 1);

const pageSizeParam = z
  .preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : value;
  }, z.number().int().min(5, 'Debe ser un entero positivo.').max(100, 'Máximo 100.').optional())
  .transform((val) => val ?? 10);

const orderByParam = z
  .preprocess((value) => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    const normalized = trimmed.toLowerCase();
    if (normalized === 'name') return 'name';
    if (normalized === 'createdat' || normalized === 'created_at') return 'createdAt';
    if (normalized === 'updatedat' || normalized === 'updated_at') return 'updatedAt';

    if (['name', 'createdAt', 'updatedAt'].includes(trimmed)) return trimmed;
    return undefined;
  }, z.enum(['name', 'createdAt', 'updatedAt']).optional())
  .transform((val) => val ?? 'name');

const orderDirParam = z
  .preprocess((value) => {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'desc') return 'desc';
    if (normalized === 'asc') return 'asc';
    return undefined;
  }, z.enum(['asc', 'desc']).optional())
  .transform((val) => val ?? 'asc');

const orderDirectionParam = z
  .preprocess((value) => {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'desc') return 'desc';
    if (normalized === 'asc') return 'asc';
    return undefined;
  }, z.enum(['asc', 'desc']).optional());

const searchParam = z
  .preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    return normalizeSearch(String(value));
  }, z.string().optional());

export const categoryListQuerySchema = z
  .object({
    page: pageParam,
    pageSize: pageSizeParam,
    q: searchParam,
    status: statusParam,
    all: boolishOptional.transform((val) => val ?? false),
    orderBy: orderByParam,
    orderDir: orderDirParam,
    orderDirection: orderDirectionParam,
  })
  .transform((values) => ({
    page: values.page,
    pageSize: values.pageSize,
    q: values.q,
    status: values.status,
    all: values.all,
    orderBy: values.orderBy,
    orderDir: values.orderDir,
    orderDirection: values.orderDirection,
  }));

export const categoryCreateSchema = z.object({
  name: nonEmptyString,
  imageUrl: optionalImageUrl.transform((val) => (val === undefined ? null : val))
});

export const categoryUpdateSchema = z.object({
  name: nonEmptyString.optional(),
  imageUrl: optionalImageUrl
});

export const categoryToggleSchema = z.object({
  active: z.preprocess((value) => {
    const normalized = toBooleanish(value);
    return typeof normalized === 'boolean' ? normalized : value;
  }, z.boolean({ required_error: 'active es requerido.' }))
});

export const categoryIdParamSchema = z.object({
  id: z
    .string({ required_error: 'Id requerido.' })
    .trim()
    .min(1, 'Id inválido.')
});
