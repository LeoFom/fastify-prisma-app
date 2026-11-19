import {z} from "zod";
import {createCartsSchema, updateCartsSchema} from "./cart.schema";

export type CreateCartInput =
  z.infer<typeof createCartsSchema>

export type UpdateCartInput =
  z.infer<typeof updateCartsSchema>

export class CartHttpError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message)
  }
}
