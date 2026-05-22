import jwt from 'jsonwebtoken'
import {AuthRepository} from "./auth.repository";
import {comparePasswords, hashPassword} from "./auth.utils";
import {LoginInput, RefreshTokenInput, RegisterInput} from "./auth.types";
import 'dotenv/config';
import {ProfileRepository} from "../profile/profile.repository";

export class AuthService {
  private repository = new AuthRepository()
  private profile = new ProfileRepository()

  async register(data: RegisterInput) {
    const existingUser = await this.repository.findByEmail(data.email)

    if (existingUser) {
      throw new Error('User already exists')
    }

    const passwordHash =
      await hashPassword(data.password)

    const user =
      await this.repository.createUser({
        email: data.email,
        passwordHash
      })

    await this.profile.create(
      user.id,
      {
        firstName: 'Coffee',
        lastName: "Is great",
      }
    )

    return user
  }

  async login(data: LoginInput) {
    const user = await this.repository.findByEmail(data.email)

    if (!user) {
      throw new Error('Invalid credentials')
    }

    const isValid =
      await comparePasswords(
        data.password,
        user.passwordHash
      )

    if (!isValid) {
      throw new Error('Invalid credentials')
    }

    const accessToken =
      jwt.sign(
        {
          userId: user.id
        },
        process.env.JWT_ACCESS_SECRET || '',
        {
          expiresIn: '15m'
        }
      )

    const refreshToken =
      jwt.sign(
        {
          userId: user.id
        },
        process.env.JWT_REFRESH_SECRET || '',
        {
          expiresIn: '7d'
        }
      )

    await this.repository.createSession({
      userId: user.id,
      refreshToken,
      expiresAt:
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    })

    return {
      accessToken,
      refreshToken
    }
  }

  async refresh(refreshToken: RefreshTokenInput) {
    if (!refreshToken) {
      throw new Error('Invalid Refresh token')
    }

    let payload: {
      userId: string
    }

    try {
      payload = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || ''
      ) as {
        userId: string
      }
    } catch {
      throw new Error('Invalid refresh token')
    }

    const session =
      await this.repository.findSessionByToken(
        refreshToken
      )

    if(!session){
      throw new Error('Session expired')
    }

    const accessToken =
      jwt.sign(
        {
          userId: payload.userId
        },
        process.env.JWT_ACCESS_SECRET || '',
        {
          expiresIn: '15m'
        }
      )

    const newRefreshToken =
      jwt.sign(
        {
          userId: payload.userId
        },
        process.env.JWT_REFRESH_SECRET || '',
        {
          expiresIn: '7d'
        }
      )

    await this.repository.deleteSessionByToken(
      refreshToken
    )

    await this.repository.createSession({
      userId: payload.userId,
      refreshToken: newRefreshToken,
      expiresAt:
        new Date(
          Date.now() +
          7 * 24 * 60 * 60 * 1000
        )
    })

    return {
      accessToken,
      refreshToken: newRefreshToken
    }
  }

  async logout(refreshToken: string) {

    await this.repository.deleteSessionByToken(
      refreshToken
    )
  }


}