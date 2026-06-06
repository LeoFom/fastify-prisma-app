import { ProductRepository } from './product.repository';
import { CreateInput, UpdateInput } from './product.types';
import { transliterate } from 'transliteration';
import slugify from 'slugify';

export class ProductService {
  constructor(private readonly repository: ProductRepository) {}

  async getAll() {
    return this.repository.findMany();
  }

  async getById(id: string) {
    const product = await this.repository.findById(id);
    if (!product) throw new Error('Product not found');
    return product;
  }

  async create(data: CreateInput) {
    const slug = slugify(
      transliterate(data.name),
      {
        lower: true,
        strict: true,
      }
    );

    return this.repository.create({
      ...data,
      slug,
    });
  }

  async update(id: string, data: UpdateInput) {
    await this.getById(id);
    return this.repository.update(id, data);
  }

  async delete(id: string) {
    await this.getById(id);
    return this.repository.delete(id);
  }
}