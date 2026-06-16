import {z} from "zod";
import {createCartsSchema} from "./cart.schema";

export type CreateCartInput =
  z.infer<typeof createCartsSchema>

export type UpdateCartInput =
  z.infer<typeof createCartsSchema>