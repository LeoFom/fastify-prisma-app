import jwt from 'jsonwebtoken'
import {AuthRepository} from "./auth.repository";
import {comparePasswords, hashPassword} from "./auth.utils";
import {LoginInput, RegisterInput} from "./auth.types";
import 'dotenv/config';
import {ProfileRepository} from "../profile/profile.repository";
import {hashToken} from "../../utils/hash-token";

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

    const user =
      await this.repository.findByEmail(
        data.email
      )

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
          userId: user.id,
          email: user.email,
        },
        process.env.JWT_ACCESS_SECRET!,
        {
          expiresIn: '15m'
        }
      )

    const refreshToken =
      jwt.sign(
        {
          userId: user.id,
        },
        process.env.JWT_REFRESH_SECRET!,
        {
          expiresIn: '7d'
        }
      )

    const hashedRefreshToken =
      hashToken(refreshToken)

    await this.repository.createSession({
      userId: user.id,
      refreshToken: hashedRefreshToken,
      expiresAt:
        new Date(
          Date.now() +
          7 * 24 * 60 * 60 * 1000
        )
    })

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
      }
    }
  }

  async refresh(refreshToken: string) {

    if (!refreshToken) {
      throw new Error('Invalid refresh token')
    }

    let payload: {
      userId: string
    }

    try {

      payload = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET!
      ) as {
        userId: string
      }

    } catch {

      throw new Error('Invalid refresh token')
    }

    const hashedRefreshToken =
      hashToken(refreshToken)

    const session =
      await this.repository.findSessionByToken(
        hashedRefreshToken
      )

    if (!session) {
      throw new Error('Session expired')
    }

    const accessToken =
      jwt.sign(
        {
          userId: payload.userId,
        },
        process.env.JWT_ACCESS_SECRET!,
        {
          expiresIn: '15m'
        }
      )

    const newRefreshToken =
      jwt.sign(
        {
          userId: payload.userId,
        },
        process.env.JWT_REFRESH_SECRET!,
        {
          expiresIn: '7d'
        }
      )

    const hashedNewRefreshToken =
      hashToken(newRefreshToken)

    await this.repository.deleteSessionByToken(
      hashedRefreshToken
    )

    await this.repository.createSession({
      userId: payload.userId,
      refreshToken:
      hashedNewRefreshToken,
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

    const hashedRefreshToken =
      hashToken(refreshToken)

    await this.repository.deleteSessionByToken(
      hashedRefreshToken
    )
  }


}