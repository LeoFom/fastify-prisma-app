import { ProfileRepository } from './profile.repository'
import {
  CreateProfileDto,
  UpdateProfileDto,
} from './profile.types'

export class ProfileService {
  constructor(
    private readonly profileRepository: ProfileRepository
  ) {}

  async getProfile(userId: string) {
    const profile =
      await this.profileRepository.findByUserId(userId)

    if (!profile) {
      throw new Error('Profile not found')
    }

    return profile
  }

  async createProfile(
    userId: string,
    data: CreateProfileDto
  ) {
    const existing =
      await this.profileRepository.findByUserId(userId)

    if (existing) {
      throw new Error('Profile already exists')
    }

    return this.profileRepository.create(userId, data)
  }

  async updateProfile(
    userId: string,
    data: UpdateProfileDto
  ) {
    await this.getProfile(userId)

    return this.profileRepository.update(userId, data)
  }

  async deleteProfile(userId: string) {
    await this.getProfile(userId)

    return this.profileRepository.delete(userId)
  }
}