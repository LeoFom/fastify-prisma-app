import Fastify from 'fastify'
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from "@fastify/jwt";
import { taskRoutes } from './modules/tasks/task.routes'
import {authRoutes} from "./modules/auth/auth.routes";
import 'dotenv/config';
import {profileRoutes} from "./modules/profile/profile.routes";

export const buildApp = () => {
  const secret = process.env.JWT_ACCESS_SECRET

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
    parseOptions: {}
  });

  app.register(taskRoutes, {
    prefix: '/tasks'
  })

  app.register(authRoutes, {
    prefix: '/auth'
  })

  app.register(profileRoutes, {
    prefix: '/profile',
  })

  app.register(fastifyJwt, {
    secret: secret!,
    cookie: { cookieName: 'accessToken', },
  })

  return app
}
