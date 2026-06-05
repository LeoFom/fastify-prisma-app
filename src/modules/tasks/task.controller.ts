import { FastifyReply, FastifyRequest } from 'fastify'
import { TaskService } from './task.service'
import { createTaskSchema } from './task.schema'

const taskService = new TaskService()

export class TaskController {

  async create(
    request: FastifyRequest,
    reply: FastifyReply
  ) {

    const userId = request.user.userId

    const body =
      createTaskSchema.parse(request.body)

    const task =
      await taskService.createTask(
        userId,
        body
      )

    return reply.status(201).send(task)
  }

  async findAll(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const userId = request.user.userId

    const tasks =
      await taskService.getTasks(userId)

    return reply.send(tasks)
  }
}