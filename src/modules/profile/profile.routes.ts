import { FastifyInstance } from 'fastify'

import { ProfileRepository } from './profile.repository'
import { ProfileService } from './profile.service'
import { ProfileController } from './profile.controller'
import {authMiddleware} from "../../shared/plugins/auth";

const repository = new ProfileRepository()
const service = new ProfileService(repository)
const controller = new ProfileController(service)

export async function profileRoutes(
  fastify: FastifyInstance
) {
  fastify.get(
    '/me',
    {
      preHandler: [authMiddleware]
    },
    controller.getProfile
  )

  fastify.post(
    '/',
    {
      preHandler: [authMiddleware]
    },
    controller.createProfile
  )

  fastify.patch(
    '/',
    {
      preHandler: [authMiddleware]
    },
    controller.updateProfile
  )

  fastify.delete(
    '/',
    {
      preHandler: [authMiddleware]
    },
    controller.deleteProfile
  )
}