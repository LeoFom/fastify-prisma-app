import { ProductRepository } from './product.repository';
import { CreateInput, UpdateInput } from './product.types';
import { transliterate } from 'transliteration';
import slugify from 'slugify';

export class ProductService {
  constructor(private readonly repository: ProductRepository) {}

  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = slugify(transliterate(name), {
      lower: true,
      strict: true,
    });

    const slugs = await this.repository.findMany({
      where: {
        slug: {
          startsWith: baseSlug,
        },
      },
      select: {
        slug: true,
      },
    });

    if (slugs.length === 0) {
      return baseSlug;
    }

    const existing = new Set(slugs.map(({ slug }) => slug));

    let i = 1;
    let slug = `${baseSlug}-${i}`;

    const start = Date.now();

    while (existing.has(slug)) {
      if (Date.now() - start > 1000) {
        throw new Error('Slug generation timeout');
      }

      i++;
      slug = `${slug}-${i}`;
    }

    return slug;
  }

  async getAll() {
    return this.repository.findMany();
  }

  async getById(id: string) {
    const product = await this.repository.findById(id);
    if (!product) throw new Error('Product not found');
    return product;
  }

  async getBySlug(slug: string) {
    const product = await this.repository.findBySlug(slug);

    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  }

  async create(data: CreateInput) {
    const slug = await this.generateUniqueSlug(data.name);

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