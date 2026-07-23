import { z } from 'zod';

export const getCitiesSchema = z.object({
  query: z.string().min(2),
});

export const getWarehousesSchema = z.object({
  cityRef: z.string(),
  query: z.string().optional(),
});