import { z } from 'zod'

export const registerSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z
      .string()
      .min(12)
      .max(72)
      .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password is too long'),
  })
  .strict()

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1).max(1024),
  })
  .strict()
