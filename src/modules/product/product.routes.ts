import { FastifyInstance } from 'fastify';
import { ProductRepository } from './product.repository';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { prisma } from "../../config/prisma";
import { authMiddleware } from "../../shared/plugins/auth";
import { adminMiddleware } from "../../shared/plugins/admin";

const repository = new ProductRepository(prisma);
const service = new ProductService(repository);
const controller = new ProductController(service);

const requireAdmin = {
  preHandler: [authMiddleware, adminMiddleware],
};

export async function productRoutes(fastify: FastifyInstance) {
  fastify.get('/', controller.getAll);
  fastify.get('/:id', controller.getById);
  fastify.get('/slug/:slug', controller.getBySlug);
  fastify.post('/', requireAdmin, controller.create);
  fastify.patch('/:id', requireAdmin, controller.update);
  fastify.delete('/:id', requireAdmin, controller.delete);
}