import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import 'dotenv/config';

export default fp(async (app) => {

  await app.register(jwt, {
    secret: process.env.JWT_ACCESS_SECRET!,

    cookie: {
      cookieName: 'accessToken',
      signed: false
    }
  })

})