// Validadores Zod para productos
import { z } from 'zod';

import { toBooleanish } from '../utils/formatters.js';

const STATUS_VALUES = ['draft', 'active', 'archived'];

const stripLegacyProductFields = (data) => {
  if (!data || typeof data !== 'object') return data;

  // Campos legacy que serán eliminados en próximas migraciones.
  const { slug: _slug, sku: _sku, currency: _currency, isFeatured: _isFeatured, ...rest } = data;
  return rest;
};

const boolishOptional = z.preprocess((value) => {
  if (value === undefined || value === null) return undefined;
  return toBooleanish(value);
}, z.boolean().optional());

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
    if (normalized === 'price') return 'price';
    if (normalized === 'updatedat' || normalized === 'updated_at') return 'updatedAt';
    if (['name', 'price', 'updatedAt'].includes(trimmed)) return trimmed;
    return undefined;
  }, z.enum(['name', 'price', 'updatedAt']).optional())
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

const statusParam = z
  .preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return undefined;
    return STATUS_VALUES.includes(normalized) || normalized === 'all' ? normalized : undefined;
  }, z.enum(['all', ...STATUS_VALUES]).optional())
  .transform((val) => val ?? 'all');

const searchParam = z
  .preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    const trimmed = String(value).trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.string().optional());

const categoryIdParam = z
  .preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    const trimmed = String(value).trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.string().optional());

const priceFilterParam = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim().replace(',', '.');
    if (!trimmed) return undefined;
    if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
      return value;
    }
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : value;
  }
  return value;
}, z.number().min(0, 'Debe ser mayor o igual a 0.').optional());

export const productListQuerySchema = z
  .object({
    page: pageParam,
    pageSize: pageSizeParam,
    q: searchParam,
    status: statusParam,
    categoryId: categoryIdParam,
    priceMin: priceFilterParam,
    priceMax: priceFilterParam,
    orderBy: orderByParam,
    orderDir: orderDirParam,
    orderDirection: orderDirectionParam,
    all: boolishOptional.transform((val) => val ?? false)
  })
  .passthrough()
  .transform((values) => ({
    page: values.page,
    pageSize: values.pageSize,
    q: values.q,
    status: values.status,
    categoryId: values.categoryId,
    priceMin: values.priceMin,
    priceMax: values.priceMax,
    orderBy: values.orderBy,
    orderDir: values.orderDir,
    orderDirection: values.orderDirection,
    all: values.all
  }));

const nameSchema = z
  .string({ required_error: 'El nombre es obligatorio.' })
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres.')
  .max(80, 'El nombre es demasiado largo.');

const descriptionInput = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : '';
}, z.union([z.string().max(1024, 'La descripción es demasiado larga.'), z.literal(''), z.null()]));

const descriptionCreateSchema = descriptionInput
  .optional()
  .transform((val) => {
    if (val === undefined || val === '') return undefined;
    if (val === null) return null;
    return val;
  });

const descriptionUpdateSchema = descriptionInput
  .optional()
  .transform((val) => {
    if (val === undefined || val === '') return undefined;
    if (val === null) return null;
    return val;
  });

const priceSchema = z
  .preprocess((value) => {
    if (value === undefined || value === null) return value;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const trimmed = value.trim().replace(',', '.');
      if (!trimmed) return value;
      if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
        return value;
      }
      const parsed = Number.parseFloat(trimmed);
      return Number.isFinite(parsed) ? parsed : value;
    }
    return value;
  }, z.number({ invalid_type_error: 'El precio debe ser numérico.' })
    .min(0, 'El precio debe ser mayor o igual a 0.'))
  .transform((val) => Math.round(val * 100) / 100);

const stockSchema = z
  .preprocess((value) => {
    if (value === undefined || value === null || value === '') return value;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return value;
      const parsed = Number.parseInt(trimmed, 10);
      return Number.isFinite(parsed) ? parsed : value;
    }
    return value;
  }, z.number({ invalid_type_error: 'El stock debe ser numérico.' })
    .int('El stock debe ser un entero.')
    .min(0, 'El stock debe ser mayor o igual a 0.'));

const statusSchema = z
  .string({ required_error: 'El estado es obligatorio.' })
  .trim()
  .transform((val) => val.toLowerCase())
  .refine((val) => STATUS_VALUES.includes(val), { message: 'Estado inválido.' });

const categoryIdSchema = z
  .string({ required_error: 'La categoría es obligatoria.' })
  .trim()
  .min(1, 'La categoría es obligatoria.');

export const productCreateSchema = z
  .object({
    name: nameSchema,
    description: descriptionCreateSchema,
    price: priceSchema,
    stock: stockSchema,
    status: statusSchema.optional().transform((val) => val ?? 'draft'),
    categoryId: categoryIdSchema
  })
  .passthrough()
  .transform(stripLegacyProductFields);

export const productUpdateSchema = z
  .object({
    name: nameSchema.optional(),
    description: descriptionUpdateSchema,
    price: priceSchema.optional(),
    stock: stockSchema.optional(),
    status: statusSchema.optional(),
    categoryId: categoryIdSchema.optional()
  })
  .passthrough()
  .transform(stripLegacyProductFields);

export const productStatusSchema = z.object({
  status: statusSchema
});

export const productIdParamSchema = z.object({
  id: z
    .string({ required_error: 'Id requerido.' })
    .trim()
    .min(1, 'Id inválido.')
});
