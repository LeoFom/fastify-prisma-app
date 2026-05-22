import {prisma} from "../../config/prisma";

export class AuthRepository {

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email }
    })
  }

  async createUser(data: {
    email: string
    passwordHash: string
  }) {

    return prisma.user.create({
      data
    })
  }

  async createSession(data: {
    userId: string
    refreshToken: string
    userAgent?: string
    ipAddress?: string
    expiresAt: Date
  }) {

    return prisma.session.create({
      data
    })
  }

  async findSessionByToken(
    refreshToken: string
  ) {
    return prisma.session.findUnique({
      where: {
        refreshToken
      }
    })
  }

  async deleteSessionByToken(
    refreshToken: string
  ) {
    return prisma.session.delete({
      where: {
        refreshToken
      }
    })
  }
}