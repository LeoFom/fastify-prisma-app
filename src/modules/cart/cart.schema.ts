import {z} from "zod";

export const createCartsSchema = z.object({
  userId: z.uuid(),
  productId: z.uuid(),
  quantity: z.number().int().min(1),
  priceAtAdding: z.number(),
})

export const updateCartsSchema = z.object({
  quantity: z.number().int().min(1),
  priceAtAdding: z.number(),
})