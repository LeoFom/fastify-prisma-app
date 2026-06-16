import { FastifyInstance } from 'fastify';
import { CartRepository } from './cart.repository';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { prisma } from "../../config/prisma";

const repository = new CartRepository(prisma);
const service = new CartService(repository);
const controller = new CartController(service);

export async function cartRoutes(fastify: FastifyInstance) {
  fastify.get('/', controller.getAll);
  fastify.get('/:id', controller.getById);
  fastify.post('/', controller.create);
  fastify.patch('/:id', controller.update);
  fastify.delete('/:id', controller.delete);
}