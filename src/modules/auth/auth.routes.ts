import { FastifyInstance } from 'fastify'
import {AuthController} from './auth.controller'
import {authMiddleware} from "../../shared/plugins/auth";

const authController = new AuthController()

export async function authRoutes(
  app: FastifyInstance
) {

  app.get(
    '/me',
    {
      preHandler: authMiddleware
    },
    async (request, reply) => {

      return reply.send(request.user)
    }
  )

  app.post('/register', authController.register)

  app.post('/log-in', authController.login)

  app.post('/logout', authController.logout)

  app.post('/refresh', authController.refresh)

}