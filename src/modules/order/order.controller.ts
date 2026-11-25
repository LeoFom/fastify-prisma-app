import { FastifyReply, FastifyRequest } from 'fastify'
import { OrderService } from './order.service'
import { createOrderSchema } from './order.schema'
import { sendMappedError } from '../../shared/http/errors'

export class OrderController {
  constructor(private readonly service: OrderService) {}

  list = async (req: FastifyRequest, res: FastifyReply) => {
    try {
      return await this.service.list(req.user.userId)
    } catch (error) {
      return this.sendError(req, res, error)
    }
  }

  getById = async (req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) => {
    try {
      return await this.service.getById(req.params.id, req.user.userId)
    } catch (error) {
      return this.sendError(req, res, error)
    }
  }

  create = async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const data = createOrderSchema.parse(req.body)
      const order = await this.service.create(req.user.userId, req.user.email, data)
      return res.status(201).send(order)
    } catch (error) {
      return this.sendError(req, res, error)
    }
  }

  private sendError(req: FastifyRequest, res: FastifyReply, error: unknown) {
    return sendMappedError(req, res, error)
  }
}
