import { z } from 'zod'

export const createProfileSchema = z.object({
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  phone: z.string().min(5).max(20).optional(),
})

export const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(100).optional(),
  lastName: z.string().min(2).max(100).optional(),
  phone: z.string().min(5).max(20).optional(),
})

export const profileResponseSchema = z.object({
  userId: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  phone: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})