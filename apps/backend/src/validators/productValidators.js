// Validadores Zod para productos
import { z } from 'zod';

import { toBooleanish } from '../utils/formatters.js';

const STATUS_VALUES = ['draft', 'active', 'archived'];

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
    isFeatured: boolishOptional,
    priceMin: priceFilterParam,
    priceMax: priceFilterParam,
    orderBy: orderByParam,
    orderDir: orderDirParam,
    orderDirection: orderDirectionParam,
    all: boolishOptional.transform((val) => val ?? false)
  })
  .transform((values) => ({
    page: values.page,
    pageSize: values.pageSize,
    q: values.q,
    status: values.status,
    categoryId: values.categoryId,
    isFeatured: values.isFeatured,
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

const slugSchema = z
  .string({ required_error: 'El slug es obligatorio.' })
  .trim()
  .min(2, 'El slug debe tener al menos 2 caracteres.')
  .max(120, 'El slug es demasiado largo.')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'El slug debe estar en kebab-case.')
  .transform((val) => val.toLowerCase());

const skuSchema = z
  .string({ required_error: 'El SKU es obligatorio.' })
  .trim()
  .min(2, 'El SKU debe tener al menos 2 caracteres.')
  .max(120, 'El SKU es demasiado largo.')
  .regex(/^[A-Z0-9_-]+$/, 'El SKU solo puede contener A-Z, 0-9, guiones o guiones bajos.')
  .transform((val) => val.toUpperCase());

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

const currencySchema = z
  .string()
  .trim()
  .default('ARS')
  .transform((val) => val.toUpperCase())
  .refine((val) => val === 'ARS', { message: 'Sólo se permite ARS.' });

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

export const productCreateSchema = z.object({
  name: nameSchema,
  slug: slugSchema,
  sku: skuSchema,
  description: descriptionCreateSchema,
  price: priceSchema,
  currency: currencySchema.optional(),
  stock: stockSchema,
  status: statusSchema.optional().transform((val) => val ?? 'draft'),
  isFeatured: boolishOptional.transform((val) => val ?? false),
  categoryId: categoryIdSchema
});

export const productUpdateSchema = z.object({
  name: nameSchema.optional(),
  slug: slugSchema.optional(),
  sku: skuSchema.optional(),
  description: descriptionUpdateSchema,
  price: priceSchema.optional(),
  currency: currencySchema.optional(),
  stock: stockSchema.optional(),
  status: statusSchema.optional(),
  isFeatured: boolishOptional,
  categoryId: categoryIdSchema.optional()
});

export const productStatusSchema = z.object({
  status: statusSchema
});

export const productIdParamSchema = z.object({
  id: z
    .string({ required_error: 'Id requerido.' })
    .trim()
    .min(1, 'Id inválido.')
});
