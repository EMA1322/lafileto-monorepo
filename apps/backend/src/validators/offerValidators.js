// Validadores Zod para ofertas
import { z } from 'zod';
import { toBooleanish } from '../utils/formatters.js';

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
    return ['all', 'draft', 'active', 'archived'].includes(normalized) ? normalized : undefined;
  }, z.enum(['all', 'draft', 'active', 'archived']).optional())
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

const discountPercentSchema = z
  .preprocess((value) => {
    if (value === undefined || value === null || value === '') return value;
    const parsed = Number.parseFloat(String(value));
    return Number.isFinite(parsed) ? Math.round(parsed) : value;
  }, z.number({ invalid_type_error: 'El descuento debe ser numérico.' })
    .int('El descuento debe ser un entero.')
    .min(1, 'El descuento debe ser al menos 1%.')
    .max(100, 'El descuento no puede superar el 100%.'));

export const offerListQuerySchema = z
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
    all: boolishOptional.transform((val) => val ?? false),
    activeOnly: boolishOptional.transform((val) => val ?? false)
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
    all: values.all,
    activeOnly: values.activeOnly
  }));

export const offerCreateSchema = z
  .object({
    productId: z
      .string({ required_error: 'El producto es obligatorio.' })
      .trim()
      .min(1, 'El producto es obligatorio.'),
    discountPercent: discountPercentSchema
  })
  .passthrough()
  .transform((values) => ({
    productId: values.productId,
    discountPercent: values.discountPercent
  }));

export const offerUpdateSchema = z
  .object({
    discountPercent: discountPercentSchema.optional()
  })
  .passthrough()
  .transform((values) => ({
    discountPercent: values.discountPercent
  }));

export const offerIdParamSchema = z.object({
  id: z
    .string({ required_error: 'Id requerido.' })
    .trim()
    .min(1, 'Id inválido.')
});
