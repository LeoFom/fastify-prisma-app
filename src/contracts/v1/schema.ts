import { z } from 'zod'

export const uuid = z.uuid()
export const currency = z.string().regex(/^[A-Z]{3}$/)
export const minor = z.number().int().safe().nonnegative()
export const isoDate = z.iso.datetime({ offset: true })
export const category = z.enum(['Coffee', 'Equipment', 'Merchandise'])

export const coffeeDetailsDTO = z.strictObject({
  coffeeType: z.enum(['Beans', 'Ground', 'Drip', 'Capsules']),
  roast: z.enum(['Light', 'Medium', 'Dark']).nullable(),
  originCountry: z.string().nullable(),
  region: z.string().nullable(),
  farm: z.string().nullable(),
  processingStation: z.string().nullable(),
  variety: z.string().nullable(),
  altitudeMin: z.number().int().nullable(),
  altitudeMax: z.number().int().nullable(),
  processingMethod: z.enum(['Washed', 'Natural', 'Honey', 'Anaerobic', 'SemiWashed']).nullable(),
  scaScore: z
    .string()
    .regex(/^\d{1,2}\.\d{2}$/)
    .nullable(),
  arabicaPercent: z.number().int().nullable(),
  robustaPercent: z.number().int().nullable(),
  acidity: z.number().int().nullable(),
  sweetness: z.number().int().nullable(),
  bitterness: z.number().int().nullable(),
  body: z.number().int().nullable(),
  caffeineLevel: z.number().int().nullable(),
  weightGrams: z.number().int().nullable(),
  roastDate: isoDate.nullable(),
  flavorNotes: z.array(z.string()),
  brewingMethods: z.array(
    z.enum(['Espresso', 'Filter', 'V60', 'Aeropress', 'Chemex', 'Moka', 'Turkish', 'FrenchPress']),
  ),
})

export const productDTO = z.strictObject({
  id: uuid,
  slug: z.string(),
  sku: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  category,
  priceMinor: minor,
  currency,
  memberDiscountPercent: z.string().regex(/^\d+\.\d{2}$/),
  stockQuantity: z.number().int().nonnegative(),
  isActive: z.boolean(),
  coffeeDetails: coffeeDetailsDTO.nullable(),
  createdAt: isoDate,
  updatedAt: isoDate,
})

export const page = z.strictObject({
  number: z.number().int().positive(),
  size: z.number().int().positive(),
  total: z.number().int().nonnegative(),
})
export const productsResponse = z.strictObject({ data: z.array(productDTO), page })
export const productResponse = z.strictObject({ data: productDTO })
export const profileDTO = z.strictObject({
  userId: uuid,
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  phone: z.string().nullable(),
  photoUrl: z.string().nullable(),
  createdAt: isoDate,
  updatedAt: isoDate,
})
export const profileResponse = z.strictObject({ data: profileDTO.nullable() })
export const profilePatch = z
  .strictObject({
    firstName: z.string().min(2).max(100).nullable().optional(),
    lastName: z.string().min(2).max(100).nullable().optional(),
    phone: z.string().min(5).max(20).nullable().optional(),
    photoUrl: z.url().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required')

// Cart revisions and quotes require the C3 persistence model. These schemas describe
// the planned wire shape; the corresponding writes are explicitly unavailable in C1.1.
export const cartItemDTO = z.strictObject({
  id: uuid,
  productId: uuid,
  quantity: z.number().int().positive(),
  unitPriceMinor: minor,
  currency,
  product: productDTO.nullable(),
})
export const cartDTO = z.strictObject({
  id: uuid,
  revision: z.number().int().nonnegative(),
  currency,
  items: z.array(cartItemDTO),
  subtotalMinor: minor,
})
export const quoteDTO = z.strictObject({
  id: uuid,
  cartId: uuid,
  cartRevision: z.number().int().nonnegative(),
  currency,
  subtotalMinor: minor,
  discountMinor: minor,
  shippingMinor: minor,
  totalMinor: minor,
  expiresAt: isoDate,
})
export const orderItemDTO = z.strictObject({
  id: uuid,
  productId: uuid.nullable(),
  productName: z.string(),
  productSlug: z.string(),
  quantity: z.number().int().positive(),
  unitPriceMinor: minor,
  currency,
})
export const orderDTO = z.strictObject({
  id: uuid,
  orderNumber: z.string(),
  status: z.enum([
    'Pending',
    'Paid',
    'Processing',
    'Shipped',
    'Delivered',
    'Cancelled',
    'Refunded',
  ]),
  currency,
  subtotalMinor: minor,
  discountMinor: minor,
  shippingMinor: minor,
  totalMinor: minor,
  items: z.array(orderItemDTO),
  placedAt: isoDate,
})

export const apiError = z.strictObject({
  error: z.strictObject({
    code: z.string(),
    message: z.string(),
    fieldErrors: z.record(z.string(), z.array(z.string())),
    requestId: z.string(),
  }),
})
export const productQuery = z.strictObject({
  q: z.string().trim().max(100).optional(),
  category: category.optional(),
  roast: z.enum(['Light', 'Medium', 'Dark']).optional(),
  sort: z.enum(['newest', 'name', 'price_asc', 'price_desc']).default('newest'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
})
export const productIdParam = z.strictObject({ id: uuid })
export const productSlugParam = z.strictObject({ slug: z.string().min(1).max(200) })
export const reservedCartWrite = z.strictObject({
  productId: uuid,
  quantity: z.number().int().positive(),
  expectedRevision: z.number().int().nonnegative(),
})
export const reservedCheckoutWrite = z.strictObject({
  quoteId: uuid,
  contact: z.strictObject({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().min(5),
  }),
  delivery: z.strictObject({
    method: z.enum(['np_warehouse', 'np_postomat']),
    cityRef: z.string().min(1),
    warehouseRef: z.string().min(1),
  }),
  paymentMethod: z.literal('cash_on_delivery'),
})

export type ProductDTO = z.infer<typeof productDTO>
export type CoffeeDetailsDTO = z.infer<typeof coffeeDetailsDTO>
export type CartDTO = z.infer<typeof cartDTO>
export type QuoteDTO = z.infer<typeof quoteDTO>
export type OrderDTO = z.infer<typeof orderDTO>
export type ProfileDTO = z.infer<typeof profileDTO>
export type ApiError = z.infer<typeof apiError>
