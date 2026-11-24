import { z } from 'zod'

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(6)
}).strict()

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6)
})
