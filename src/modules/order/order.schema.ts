import { z } from 'zod';

const npCitySchema = z.object({
  ref: z.string().min(1),
  cityRef: z.string().optional(),
  name: z.string().optional(),
  shortName: z.string().optional(),
  area: z.string().optional(),
});

const npWarehouseSchema = z.object({
  ref: z.string().min(1),
  number: z.string().optional().default(''),
  name: z.string().min(1),
  shortAddress: z.string().optional(),
  categoryOfWarehouse: z.string().optional(),
});

const npDeliverySchema = z.object({
  method: z.enum(['np_warehouse', 'np_postomat']),
  city: npCitySchema,
  warehouse: npWarehouseSchema,
  address: z.string().optional().default(''),
});

const courierDeliverySchema = z.object({
  method: z.literal('courier'),
  city: npCitySchema.nullable().optional(),
  warehouse: npWarehouseSchema.nullable().optional(),
  address: z.string().trim().min(1),
});

export const createOrderSchema = z.object({
  contact: z.object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    phone: z
      .string()
      .transform((value) => value.replace(/\s/g, ''))
      .pipe(z.string().regex(/^\+?380\d{9}$/)),
    email: z
      .string()
      .trim()
      .default('')
      .refine(
        (value) => value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        { message: 'Invalid email' }
      ),
  }),
  delivery: z.discriminatedUnion('method', [
    npDeliverySchema,
    courierDeliverySchema,
  ]),
  payment: z.object({
    method: z.enum(['cash_on_delivery', 'online', 'card']),
  }),
  comment: z.string().optional().default(''),
});
