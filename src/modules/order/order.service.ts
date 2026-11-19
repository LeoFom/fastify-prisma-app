import { OrderRepository } from './order.repository';
import { CreateOrderInput, OrderHttpError } from './order.types';
import { serializeOrder } from './order.mapper';

export class OrderService {
  constructor(private readonly repository: OrderRepository) {}

  async list(userId: string) {
    return this.repository.findManyByUserId(userId);
  }

  async getById(id: string, userId: string) {
    const uuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuid.test(id)) {
      throw new OrderHttpError(404, 'Order not found');
    }

    const order = await this.repository.findById(id);

    if (!order || order.userId !== userId) {
      throw new OrderHttpError(404, 'Order not found');
    }

    return serializeOrder(order);
  }

  async create(userId: string, userEmail: string, input: CreateOrderInput) {
    return this.repository.createFromCart(userId, userEmail, input);
  }
}
