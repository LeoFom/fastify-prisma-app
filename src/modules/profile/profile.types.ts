import { z } from 'zod'
import {
  createProfileSchema,
  updateProfileSchema,
} from './profile.schema'

export type CreateProfileDto = z.infer<typeof createProfileSchema>

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>

export interface ProfileParams {
  userId: string
}