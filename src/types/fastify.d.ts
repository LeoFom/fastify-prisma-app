import '@fastify/jwt'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      id: string
      email: string
    }

    user: {
      userId: string
      email: string
    }
  }
}