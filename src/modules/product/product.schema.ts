import { z } from 'zod';
import { ProductCategory, RoastType } from '../../../src/generated/prisma/client';

export const createProductsSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10).optional(),
  imageUrl: z.string().optional(),
  category: z.enum(Object.values(ProductCategory) as [string, ...string[]]),
  roast: z.enum(Object.values(RoastType) as [string, ...string[]]).optional(),
  price: z.number().positive(),
})

export const updateProductsSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10).optional(),
  imageUrl: z.string().optional(),
  category: z.enum(Object.values(ProductCategory) as [string, ...string[]]),
  roast: z.enum(Object.values(RoastType) as [string, ...string[]]).optional(),
  price: z.number().positive(),
}).partial();