import { CartRepository } from './cart.repository';
import { CartHttpError, CreateCartInput, UpdateCartInput } from './cart.types';

export class CartService {
  constructor(private readonly repository: CartRepository) {}

  async getAll(userId: string) {
    return this.repository.findMany(userId);
  }

  async getById(id: string, userId: string) {
    return this.requireOwned(id, userId);
  }

  async create(userId: string, data: CreateCartInput) {
    return this.repository.upsert(userId, data);
  }

  async update(id: string, userId: string, data: UpdateCartInput) {
    await this.requireOwned(id, userId);
    return this.repository.update(id, data);
  }

  async delete(id: string, userId: string) {
    await this.requireOwned(id, userId);
    return this.repository.delete(id);
  }

  private async requireOwned(id: string, userId: string) {
    const item = await this.repository.findById(id);

    if (!item || item.userId !== userId) {
      throw new CartHttpError(404, 'Cart item not found');
    }

    return item;
  }
}
