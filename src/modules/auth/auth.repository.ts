import {prisma} from "../../config/prisma";

export class AuthRepository {

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email }
    })
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id }
    })
  }

  async createUser(data: {
    email: string
    passwordHash: string
  }) {

    return prisma.user.create({
      data: {
        ...data,
        role:
          process.env.ADMIN_EMAIL?.trim() === data.email
            ? 'Admin'
            : 'Customer',
      }
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

  // Expects hashToken(rawCookie), never the raw refresh JWT.
  async findSessionByToken(
    hashedRefreshToken: string
  ) {
    return prisma.session.findUnique({
      where: {
        refreshToken: hashedRefreshToken
      }
    })
  }

  // Expects hashToken(rawCookie), never the raw refresh JWT.
  async deleteSessionByToken(
    hashedRefreshToken: string
  ) {
    return prisma.session.deleteMany({
      where: {
        refreshToken: hashedRefreshToken
      }
    })
  }
}