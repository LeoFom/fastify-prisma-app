import { Prisma, PrismaClient} from '../../generated/prisma/client';
import {DefaultArgs} from "../../generated/prisma/runtime/client";
import {CreateInput, UpdateInput} from './product.types';

export class ProductRepository {
  constructor(private readonly prisma: PrismaClient) {
  }

  // Посмотреть поле slug для data (CreateInput)
  async create(data: CreateInput & { slug: string }) {
    return this.prisma.product.create({
      data
    });
  }

  async findMany(params?: { select?: Prisma.ProductSelect<DefaultArgs> | null | undefined; omit?: Prisma.ProductOmit<DefaultArgs> | null | undefined; include?: Prisma.ProductInclude<DefaultArgs> | null | undefined; where?: Prisma.ProductWhereInput | undefined; orderBy?: (Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[]) | undefined; cursor?: Prisma.ProductWhereUniqueInput | undefined; take?: number | undefined; skip?: number | undefined; distinct?: (Prisma.ProductScalarFieldEnum | Prisma.ProductScalarFieldEnum[]) | undefined; } | undefined) {
    return this.prisma.product.findMany(params);
  }

  async findById(id: string) {
    return this.prisma.product.findUnique({ where: { id } });
  }

  async findBySlug(slug: string) {
    return this.prisma.product.findUnique({
      where: {
        slug,
      },
    });
  }

  async update(id: string, data: UpdateInput) {
    return this.prisma.product.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }
}