import { FastifyInstance } from 'fastify';
import { ProductRepository } from './product.repository';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { prisma } from "../../config/prisma";

const repository = new ProductRepository(prisma);
const service = new ProductService(repository);
const controller = new ProductController(service);

export async function productRoutes(fastify: FastifyInstance) {
  fastify.get('/', controller.getAll);
  fastify.get('/:id', controller.getById);
  fastify.post('/', controller.create);
  fastify.patch('/:id', controller.update);
  fastify.delete('/:id', controller.delete);
}