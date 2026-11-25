import { FastifyRequest, FastifyReply } from 'fastify'
import { ProductService } from './product.service'
import { createProductsSchema, updateProductsSchema } from './product.schema'
import { sendMappedError } from '../../shared/http/errors'

export class ProductController {
  constructor(private readonly service: ProductService) {}

  getAll = async (_req: FastifyRequest, _res: FastifyReply) => {
    return this.service.getAll()
  }

  getById = async (req: FastifyRequest<{ Params: { id: string } }>, _res: FastifyReply) => {
    return this.service.getById(req.params.id)
  }

  getBySlug = async (req: FastifyRequest<{ Params: { slug: string } }>, _res: FastifyReply) => {
    return this.service.getBySlug(req.params.slug)
  }

  create = async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const data = createProductsSchema.parse(req.body)

      const product = await this.service.create(data)

      return res.status(201).send(product)
    } catch (error) {
      return sendMappedError(req, res, error)
    }
  }

  update = async (req: FastifyRequest<{ Params: { id: string } }>, _res: FastifyReply) => {
    const data = updateProductsSchema.parse(req.body)
    return this.service.update(req.params.id, data)
  }

  delete = async (req: FastifyRequest<{ Params: { id: string } }>, _res: FastifyReply) => {
    return this.service.delete(req.params.id)
  }
}
