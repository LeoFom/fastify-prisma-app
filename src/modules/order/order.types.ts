import { z } from 'zod';
import { createOrderSchema } from './order.schema';

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export class OrderHttpError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}
