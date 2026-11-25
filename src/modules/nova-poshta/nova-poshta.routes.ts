import { FastifyInstance } from 'fastify'
import { NovaPoshtaRepository } from './nova-poshta.repository'
import { NovaPoshtaService } from './nova-poshta.service'
import { NovaPoshtaController } from './nova-poshta.controller'
import { sendMappedError } from '../../shared/http/errors'

// const repository = new NovaPoshtaRepository(prisma);
// const service = new NovaPoshtaService(repository);
// const controller = new NovaPoshtaController(service);

// export async function novaPoshtaRoutes(fastify: FastifyInstance) {
//   fastify.get('/', controller.getAll);
//   fastify.get('/:id', controller.getById);
//   fastify.get('/slug/:slug', controller.getBySlug);
//   fastify.post('/', controller.create);
//   fastify.patch('/:id', controller.update);
//   fastify.delete('/:id', controller.delete);
// }

export async function novaPoshtaRouter(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (request, reply) => {
    if (!process.env.NOVA_POSHTA_API_KEY)
      return sendMappedError(request, reply, new Error('Nova Poshta API request failed'))
  })
  const repository = new NovaPoshtaRepository(process.env.NOVA_POSHTA_API_KEY!)

  const service = new NovaPoshtaService(repository)

  const controller = new NovaPoshtaController(service)

  fastify.get('/cities', controller.getCities)

  fastify.get('/settlements', controller.getSettlements)

  fastify.get('/warehouses', controller.getWarehouses)
}
