import {FastifyReply, FastifyRequest} from 'fastify';
import {CartService} from './cart.service';
import {createCartsSchema, updateCartsSchema} from './cart.schema';
import {CartHttpError} from './cart.types';
import {z, ZodError} from "zod";
import '@fastify/cookie';

export class CartController {
  constructor(private readonly service: CartService) {}

  getAll = async (req: FastifyRequest, res: FastifyReply) => {
    try {
      return await this.service.getAll(req.user.userId);
    } catch (error) {
      return this.sendError(req, res, error);
    }
  };

  getById = async (req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) => {
    try {
      return await this.service.getById(req.params.id, req.user.userId);
    } catch (error) {
      return this.sendError(req, res, error);
    }
  };

  create = async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const data = createCartsSchema.parse(req.body);
      const item = await this.service.create(req.user.userId, data);
      return res.status(201).send(item);
    } catch (error) {
      return this.sendError(req, res, error);
    }
  };

  update = async (req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) => {
    try {
      const data = updateCartsSchema.parse(req.body);
      return await this.service.update(req.params.id, req.user.userId, data);
    } catch (error) {
      return this.sendError(req, res, error);
    }
  };

  delete = async (req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) => {
    try {
      const item = await this.service.delete(req.params.id, req.user.userId);
      return res.send(item);
    } catch (error) {
      return this.sendError(req, res, error);
    }
  };

  private sendError(req: FastifyRequest, res: FastifyReply, error: unknown) {
    if (error instanceof CartHttpError) {
      return res.status(error.statusCode).send({ message: error.message });
    }

    if (error instanceof ZodError) {
      return res.status(400).send({
        message: "Validation failed",
        errors: z.treeifyError(error),
      });
    }

    req.log.error(error);
    return res.status(500).send({
      message: "Internal server error",
    });
  }
}
