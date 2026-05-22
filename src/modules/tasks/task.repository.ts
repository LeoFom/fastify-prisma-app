// @ts-ignore
import { prisma } from '../../config/prisma'
import {
  CreateTaskInput,
  UpdateTaskInput
} from './task.types'

export class TaskRepository {

  async create(
    userId: string,
    data: CreateTaskInput
  ) {
    return prisma.task.create({
      data: {
        ...data,
        userId,
      }
    })
  }

  async findAll(userId: string) {
    return prisma.task.findMany({
      where: {
        userId: userId
      }
    })
  }

  async update(
    id: number,
    data: UpdateTaskInput
  ) {
    return prisma.task.update({
      where: { id },
      data
    })
  }

  async delete(id: number) {
    return prisma.task.delete({
      where: { id }
    })
  }
}