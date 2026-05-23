import Fastify from 'fastify'
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from "@fastify/jwt";
import { taskRoutes } from './modules/tasks/task.routes'
import {authRoutes} from "./modules/auth/auth.routes";
import 'dotenv/config';
import {profileRoutes} from "./modules/profile/profile.routes";
import {productRoutes} from "./modules/product/product.routes";

export const buildApp = () => {
  const secret = process.env.JWT_ACCESS_SECRET
  if (!secret) throw new Error("JWT_ACCESS_SECRET is missing");

  const app = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname', // Скрываем лишнее
          // Настраиваем формат сообщения
          messageFormat: '{req.method} {req.url} {res.statusCode}',
          colorize: true
        }
      }
    }
  })

  app.register(fastifyCookie, {
    secret: secret,
    hook: 'onRequest',
    // parseOptions: {}
  });

  app.register(fastifyJwt, {
    secret: secret,
    cookie: {
      cookieName: 'accessToken',
      signed: true,
    },
  })

  app.register(taskRoutes, {
    prefix: '/tasks'
  })

  app.register(authRoutes, {
    prefix: '/auth'
  })

  app.register(profileRoutes, {
    prefix: '/profile',
  })

  app.register(productRoutes, {
    prefix: '/products',
  })

  return app
}
