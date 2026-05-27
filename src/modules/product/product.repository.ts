import { PrismaClient } from '../../generated/prisma/client';
import { CreateInput, UpdateInput } from './product.types';

export class ProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Посмотреть поле slug для data (CreateInput)
  async create(data: CreateInput & { slug: string }) {
    return this.prisma.product.create({
      data
    });
  }

  async findMany() {
    return this.prisma.product.findMany();
  }

  async findById(id: string) {
    return this.prisma.product.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdateInput) {
    return this.prisma.product.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }
}