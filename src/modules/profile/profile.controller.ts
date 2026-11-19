import { FastifyReply, FastifyRequest } from 'fastify'
import { ProfileService } from './profile.service'
import { createProfileSchema, updateProfileSchema } from './profile.schema'

export class ProfileController {
  constructor(
    private readonly profileService: ProfileService
  ) {}

  getProfile = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const userId = request.user.userId

    const profile =
      await this.profileService.getProfile(userId)

    return reply.send(profile)
  }

  createProfile = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const userId = request.user.userId
    const body = createProfileSchema.parse(request.body)

    const profile =
      await this.profileService.createProfile(
        userId,
        body
      )

    return reply.code(201).send(profile)
  }

  updateProfile = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const userId = request.user.userId
    const body = updateProfileSchema.parse(request.body)

    const profile =
      await this.profileService.updateProfile(
        userId,
        body
      )

    return reply.send(profile)
  }

  deleteProfile = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const userId = request.user.userId

    await this.profileService.deleteProfile(userId)

    return reply.code(204).send()
  }
}
