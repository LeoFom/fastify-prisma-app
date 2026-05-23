import { z } from 'zod';
import {createProductsSchema, updateProductsSchema} from "./product.schema";

export type CreateInput =
  z.infer<typeof createProductsSchema>

export type UpdateInput =
  z.infer<typeof updateProductsSchema>
