import { FastifyRequest, FastifyReply } from 'fastify';
import { ProductService } from './product.service';
import { createProductsSchema, updateProductsSchema } from './product.schema';
import {z, ZodError} from "zod";

export class ProductController {
  constructor(private readonly service: ProductService) {}

  getAll = async (req: FastifyRequest, res: FastifyReply) => {
    return this.service.getAll();
  };

  getById = async (req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) => {
    return this.service.getById(req.params.id);
  };

  create = async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const data = createProductsSchema.parse(req.body);

      const product = await this.service.create(data);

      return res.status(201).send(product);
    } catch (error) {
      console.dir(error, { depth: null });

      if (error instanceof ZodError) {
        return res.status(400).send({
          message: "Validation failed",
          errors: z.treeifyError(error),
        });
      }

      req.log.error(`(create products) ERROR LOG: ${error}`);

      return res.status(500).send({
        message: "Internal server error",
      });
    }
  };

  update = async (req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) => {
    const data = updateProductsSchema.parse(req.body);
    return this.service.update(req.params.id, data);
  };

  delete = async (req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) => {
    return this.service.delete(req.params.id);
  };
}