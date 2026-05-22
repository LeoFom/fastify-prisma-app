import { z } from 'zod'
import {
  registerSchema,
  loginSchema
} from './auth.schema'

export type RegisterInput =
  z.infer<typeof registerSchema>

export type LoginInput =
  z.infer<typeof loginSchema>

export type RefreshTokenInput = string