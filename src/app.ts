import Fastify from 'fastify'
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from "@fastify/jwt";
import {authRoutes} from "./modules/auth/auth.routes";
import 'dotenv/config';
import {profileRoutes} from "./modules/profile/profile.routes";
import {productRoutes} from "./modules/product/product.routes";
import {cartRoutes} from "./modules/cart/cart.routes";
import {novaPoshtaRouter} from "./modules/nova-poshta/nova-poshta.routes";
import {orderRoutes} from "./modules/order/order.routes";

export const buildApp = () => {
  const secret = process.env.JWT_ACCESS_SECRET
  const secretCookie = process.env.COOKIE_SECRET
  const refreshSecret = process.env.JWT_REFRESH_SECRET
  const databaseUrl = process.env.DATABASE_URL

  if (!secret) throw new Error("JWT_ACCESS_SECRET is missing");
  if (!secretCookie) throw new Error("COOKIE_SECRET is missing");
  if (!refreshSecret) throw new Error("JWT_REFRESH_SECRET is missing");
  if (!databaseUrl) throw new Error("DATABASE_URL is missing");

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
    secret: secretCookie,
  });

  app.register(fastifyJwt, {
    secret: secret,
    cookie: {
      cookieName: 'accessToken',
      signed: false,
    },
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

  app.register(cartRoutes, {
    prefix: '/cart',
  })

  app.register(novaPoshtaRouter, {
    prefix: '/nova-poshta',
  })

  app.register(orderRoutes, {
    prefix: '/orders',
  })

  return app
}
