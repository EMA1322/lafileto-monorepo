// Validadores Zod para ofertas
import { z } from 'zod';

const productIdSchema = z
  .string({ required_error: 'El producto es obligatorio.' })
  .trim()
  .min(1, 'Seleccioná un producto válido.');

function preprocessDate(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? value : value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? value : parsed;
  }
  if (typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed;
  }
  return value;
}

const nullableDateSchema = z.preprocess(preprocessDate, z.union([z.date(), z.null()]).optional());

const discountPercentSchema = z
  .preprocess((value) => {
    if (value === undefined || value === null || value === '') return value;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const normalized = value.replace(',', '.').trim();
      if (!normalized) return value;
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : value;
    }
    return value;
  },
  z
    .number({ required_error: 'Ingresá el porcentaje de descuento.' })
    .min(0, 'El descuento debe ser mayor o igual a 0.')
    .max(100, 'El descuento no puede superar 100.'))
  .transform((val) => Math.round(val));

function validateDateRange(data, ctx) {
  const { startsAt, endsAt } = data;
  if (startsAt && endsAt && startsAt.getTime() > endsAt.getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La fecha de fin debe ser posterior a la de inicio.',
      path: ['endsAt']
    });
  }
}

export const offerCreateSchema = z
  .object({
    productId: productIdSchema,
    discountPercent: discountPercentSchema,
    startsAt: nullableDateSchema,
    endsAt: nullableDateSchema
  })
  .superRefine(validateDateRange)
  .transform((data) => ({
    productId: data.productId,
    discountPercent: data.discountPercent,
    startsAt: data.startsAt ?? null,
    endsAt: data.endsAt ?? null
  }));

export const offerUpdateSchema = z
  .object({
    productId: productIdSchema.optional(),
    discountPercent: discountPercentSchema.optional(),
    startsAt: nullableDateSchema,
    endsAt: nullableDateSchema
  })
  .superRefine((data, ctx) => {
    if (
      data.productId === undefined &&
      data.discountPercent === undefined &&
      data.startsAt === undefined &&
      data.endsAt === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Indicá algún dato para actualizar.',
        path: ['_']
      });
    }
    validateDateRange(data, ctx);
  })
  .transform((data) => ({
    ...(data.productId !== undefined ? { productId: data.productId } : {}),
    ...(data.discountPercent !== undefined ? { discountPercent: data.discountPercent } : {}),
    ...(data.startsAt !== undefined ? { startsAt: data.startsAt ?? null } : {}),
    ...(data.endsAt !== undefined ? { endsAt: data.endsAt ?? null } : {})
  }));

export const offerIdParamSchema = z.object({
  id: z
    .string({ required_error: 'Id requerido.' })
    .trim()
    .min(1, 'Id inválido.')
});
