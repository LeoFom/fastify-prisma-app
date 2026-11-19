import { FastifyInstance } from 'fastify';
import { OrderRepository } from './order.repository';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { prisma } from '../../config/prisma';
import { authMiddleware } from '../../shared/plugins/auth';

const repository = new OrderRepository(prisma);
const service = new OrderService(repository);
const controller = new OrderController(service);

export async function orderRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/', controller.list);
  fastify.get('/:id', controller.getById);
  fastify.post('/', controller.create);
}
