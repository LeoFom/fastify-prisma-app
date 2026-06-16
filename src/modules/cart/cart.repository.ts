import { PrismaClient } from '../../generated/prisma/client';
import { CreateCartInput, UpdateCartInput } from './cart.types';

export class CartRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: any) {
    return this.prisma.cartItem.create({
      data
    });
  }

  async findMany(userId: string) {
    return this.prisma.cartItem.findMany({
      where: {
        userId,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.cartItem.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdateCartInput) {
    return this.prisma.cartItem.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.cartItem.delete({ where: { id } });
  }
}