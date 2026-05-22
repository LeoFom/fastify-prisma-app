import { FastifyInstance } from 'fastify'
import { TaskController } from './task.controller'

const taskController = new TaskController()

export async function taskRoutes(
  app: FastifyInstance
) {

  app.post('/', taskController.create)

  app.get('/', taskController.findAll)
}