import { PrismaClient } from '@prisma/client';
import { CreateCartInput, UpdateCartInput } from './cart.types';

export class CartRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsert(userId: string, data: CreateCartInput) {
    return this.prisma.cartItem.upsert({
      where: {
        userId_productId: {
          userId,
          productId: data.productId,
        },
      },
      create: {
        userId,
        productId: data.productId,
        quantity: data.quantity,
        priceAtAdding: data.priceAtAdding,
      },
      update: {
        quantity: {
          increment: data.quantity,
        },
        priceAtAdding: data.priceAtAdding,
      },
      include: {
        product: true,
      },
    });
  }

  async findMany(userId: string) {
    return this.prisma.cartItem.findMany({
      where: {
        userId,
      },
      include: {
        product: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.cartItem.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });
  }

  async update(id: string, data: UpdateCartInput) {
    return this.prisma.cartItem.update({
      where: { id },
      data,
      include: {
        product: true,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.cartItem.delete({
      where: { id },
    });
  }
}
