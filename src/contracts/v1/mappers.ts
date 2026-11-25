import type { Prisma } from '@prisma/client'
import type { ProductDTO, ProfileDTO } from './schema'

type DecimalValue = { toString(): string }

// Decimal.toString() is exact. Converting to Number before multiplying loses cents.
export function decimalToMinor(value: DecimalValue): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.toString())
  if (!match) throw new Error('Invalid persisted money value')
  const result = BigInt(match[1]!) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'))
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Money exceeds safe integer range')
  return Number(result)
}

const productInclude = { coffeeDetails: { include: { flavorNotes: true } } } as const
export type ProductRecord = Prisma.ProductGetPayload<{ include: typeof productInclude }>
export { productInclude }

export function toProductDTO(product: ProductRecord): ProductDTO {
  const details = product.coffeeDetails
  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    description: product.description,
    imageUrl: product.imageUrl,
    category: product.category,
    priceMinor: decimalToMinor(product.price),
    currency: product.currency,
    memberDiscountPercent: product.memberDiscountPercent.toFixed(2),
    stockQuantity: product.stockQuantity,
    isActive: product.isActive,
    coffeeDetails: details
      ? {
          coffeeType: details.coffeeType,
          roast: details.roast,
          originCountry: details.originCountry,
          region: details.region,
          farm: details.farm,
          processingStation: details.processingStation,
          variety: details.variety,
          altitudeMin: details.altitudeMin,
          altitudeMax: details.altitudeMax,
          processingMethod: details.processingMethod,
          scaScore: details.scaScore?.toFixed(2) ?? null,
          arabicaPercent: details.arabicaPercent,
          robustaPercent: details.robustaPercent,
          acidity: details.acidity,
          sweetness: details.sweetness,
          bitterness: details.bitterness,
          body: details.body,
          caffeineLevel: details.caffeineLevel,
          weightGrams: details.weightGrams,
          roastDate: details.roastDate?.toISOString() ?? null,
          flavorNotes: details.flavorNotes.map((note) => note.name),
          brewingMethods: details.brewingMethods,
        }
      : null,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  }
}

type ProfileRecord = Prisma.ProfileGetPayload<Record<string, never>>
export function toProfileDTO(profile: ProfileRecord): ProfileDTO {
  return {
    userId: profile.userId,
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    photoUrl: profile.photoUrl,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  }
}
