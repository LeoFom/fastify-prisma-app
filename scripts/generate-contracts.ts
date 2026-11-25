import { createHash } from 'node:crypto'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'
import prettier from 'prettier'
import * as contract from '../src/contracts/v1/schema.ts'

const schemas = {
  ApiError: contract.apiError,
  CartDTO: contract.cartDTO,
  CartItemDTO: contract.cartItemDTO,
  CoffeeDetailsDTO: contract.coffeeDetailsDTO,
  OrderDTO: contract.orderDTO,
  OrderItemDTO: contract.orderItemDTO,
  Pagination: contract.page,
  ProductDTO: contract.productDTO,
  ProductResponse: contract.productResponse,
  ProductsResponse: contract.productsResponse,
  ProfileDTO: contract.profileDTO,
  ProfileResponse: contract.profileResponse,
  ProfilePatch: contract.profilePatch,
  QuoteDTO: contract.quoteDTO,
  ProductQuery: contract.productQuery,
  ReservedCartWrite: contract.reservedCartWrite,
  ReservedCheckoutWrite: contract.reservedCheckoutWrite,
}
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })
const errorResponse = {
  description: 'Structured error',
  content: { 'application/json': { schema: ref('ApiError') } },
}
const response = (name: string, description: string) => ({
  description,
  content: { 'application/json': { schema: ref(name) } },
})

const source = readFileSync(resolve('src/contracts/v1/schema.ts'))
const sha256 = createHash('sha256').update(source).digest('hex')
const document = {
  openapi: '3.1.0',
  info: {
    title: 'Coffeo API contract',
    version: '1.0.0',
    description: 'C1.1 contract. Cart, checkout, and admin writes are reserved and return 501.',
  },
  servers: [{ url: '/v1' }],
  'x-contract-source-sha256': sha256,
  components: {
    securitySchemes: { sessionCookie: { type: 'apiKey', in: 'cookie', name: 'accessToken' } },
    schemas: Object.fromEntries(
      Object.entries(schemas).map(([name, schema]) => [
        name,
        z.toJSONSchema(schema, { target: 'draft-2020-12' }),
      ]),
    ),
  },
  paths: {
    '/products': {
      get: {
        operationId: 'listProducts',
        description: 'Active catalog; stable pagination.',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'roast', in: 'query', schema: { type: 'string' } },
          { name: 'sort', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          '200': response('ProductsResponse', 'Products'),
          '400': errorResponse,
          '500': errorResponse,
        },
      },
    },
    '/products/{id}': {
      get: {
        operationId: 'getProduct',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': response('ProductResponse', 'Product'),
          '400': errorResponse,
          '404': errorResponse,
        },
      },
    },
    '/products/slug/{slug}': {
      get: {
        operationId: 'getProductBySlug',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': response('ProductResponse', 'Product'), '404': errorResponse },
      },
    },
    '/profile/me': {
      get: {
        operationId: 'getProfile',
        security: [{ sessionCookie: [] }],
        responses: { '200': response('ProfileResponse', 'Profile or null'), '401': errorResponse },
      },
      patch: {
        operationId: 'patchProfile',
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: ref('ProfilePatch') } },
        },
        responses: {
          '200': response('ProfileResponse', 'Updated profile'),
          '400': errorResponse,
          '401': errorResponse,
        },
      },
    },
    '/cart/items': {
      post: {
        operationId: 'reservedCartWrite',
        description: 'Reserved for C3. Valid request returns 501.',
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: ref('ReservedCartWrite') } },
        },
        responses: { '400': errorResponse, '401': errorResponse, '501': errorResponse },
      },
    },
    '/orders': {
      post: {
        operationId: 'reservedCheckoutWrite',
        description: 'Reserved for C3. Valid request returns 501.',
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: ref('ReservedCheckoutWrite') } },
        },
        responses: { '400': errorResponse, '401': errorResponse, '501': errorResponse },
      },
    },
    '/admin/products': {
      post: {
        operationId: 'reservedProductWrite',
        description: 'Reserved for C2. Returns 501 for authenticated admin.',
        security: [{ sessionCookie: [] }],
        responses: {
          '400': errorResponse,
          '401': errorResponse,
          '403': errorResponse,
          '501': errorResponse,
        },
      },
    },
  },
}

const target = resolve('openapi/coffeo.v1.json')
async function main() {
  const options = (await prettier.resolveConfig(target)) ?? {}
  const output = await prettier.format(JSON.stringify(document), { ...options, filepath: target })
  if (process.argv.includes('--check')) {
    if (readFileSync(target, 'utf8') !== output) throw new Error('OpenAPI artifact is stale')
  } else {
    mkdirSync(resolve('openapi'), { recursive: true })
    writeFileSync(target, output)
  }
  process.stdout.write(`Coffeo v1 source SHA-256: ${sha256}\n`)
}
void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
