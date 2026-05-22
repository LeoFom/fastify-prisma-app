import {prisma} from "../../config/prisma";
import {
  CreateProfileDto,
  UpdateProfileDto,
} from './profile.types'

export class ProfileRepository {
  async findByUserId(userId: string) {
    return prisma.profile.findUnique({
      where: {
        userId,
      },
    })
  }

  async create(userId: string, data: CreateProfileDto) {
    return prisma.profile.create({
      data: {
        userId,
        ...data,
      },
    })
  }

  async update(userId: string, data: UpdateProfileDto) {
    return prisma.profile.update({
      where: {
        userId,
      },
      data,
    })
  }

  async delete(userId: string) {
    return prisma.profile.delete({
      where: {
        userId,
      },
    })
  }
}