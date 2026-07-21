import { z } from 'zod';
import { ProductCategory, RoastType } from '../../../src/generated/prisma/client';

export const createProductsSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10).optional(),
  imageUrl: z.string().optional(),
  category: z.nativeEnum(ProductCategory),
  // roast: z.nativeEnum(RoastType).optional(),
  price: z.number().positive(),
})

export const updateProductsSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10).optional(),
  imageUrl: z.string().optional(),
  category: z.nativeEnum(ProductCategory),
  roast: z.nativeEnum(RoastType).optional(),
  price: z.number().positive(),
}).partial();