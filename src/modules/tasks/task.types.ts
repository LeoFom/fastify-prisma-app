import { z } from 'zod'
import {
  createTaskSchema,
  updateTaskSchema
} from './task.schema'

export type CreateTaskInput =
  z.infer<typeof createTaskSchema>

export type UpdateTaskInput =
  z.infer<typeof updateTaskSchema>