import { FastifyReply, FastifyRequest } from 'fastify';
import { z, ZodError } from 'zod';
import { OrderService } from './order.service';
import { createOrderSchema } from './order.schema';
import { OrderHttpError } from './order.types';

export class OrderController {
  constructor(private readonly service: OrderService) {}

  list = async (req: FastifyRequest, res: FastifyReply) => {
    try {
      return await this.service.list(req.user.userId);
    } catch (error) {
      return this.sendError(req, res, error);
    }
  };

  getById = async (
    req: FastifyRequest<{ Params: { id: string } }>,
    res: FastifyReply
  ) => {
    try {
      return await this.service.getById(req.params.id, req.user.userId);
    } catch (error) {
      return this.sendError(req, res, error);
    }
  };

  create = async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const data = createOrderSchema.parse(req.body);
      const order = await this.service.create(
        req.user.userId,
        req.user.email,
        data
      );
      return res.status(201).send(order);
    } catch (error) {
      return this.sendError(req, res, error);
    }
  };

  private sendError(req: FastifyRequest, res: FastifyReply, error: unknown) {
    if (error instanceof OrderHttpError) {
      return res.status(error.statusCode).send({ message: error.message });
    }

    if (error instanceof ZodError) {
      return res.status(400).send({
        message: 'Validation failed',
        errors: z.treeifyError(error),
      });
    }

    req.log.error(error);
    return res.status(500).send({
      message: 'Internal server error',
    });
  }
}
