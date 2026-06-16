import { CartRepository } from './cart.repository';
import { CreateCartInput, UpdateCartInput } from './cart.types';

export class CartService {
  constructor(private readonly repository: CartRepository) {}

  async getAll(userId: string) {
    return this.repository.findMany(userId);
  }

  async getById(id: string) {
    const product = await this.repository.findById(id);
    if (!product) throw new Error('Product not found');
    return product;
  }

  async create(data: CreateCartInput) {
    return this.repository.create({
      ...data,
    });
  }

  async update(id: string, data: UpdateCartInput) {
    await this.getById(id);
    return this.repository.update(id, data);
  }

  async delete(id: string) {
    await this.getById(id);
    return this.repository.delete(id);
  }
}