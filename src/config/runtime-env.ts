import { z } from 'zod'

const postgresUrl = z
  .string()
  .min(1)
  .refine((value) => {
    try {
      const url = new URL(value)
      return (
        ['postgres:', 'postgresql:'].includes(url.protocol) &&
        Boolean(url.hostname && url.username && url.pathname.length > 1)
      )
    } catch {
      return false
    }
  }, 'A PostgreSQL URL is required')

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    DATABASE_URL: postgresUrl,
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    COOKIE_SECRET: z.string().min(32),
    INTERNAL_API_KEY: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(1).optional(),
    ),
  })
  .superRefine((value, context) => {
    if (value.JWT_ACCESS_SECRET === value.JWT_REFRESH_SECRET) {
      context.addIssue({
        code: 'custom',
        path: ['JWT_REFRESH_SECRET'],
        message: 'Must differ from access secret',
      })
    }
    if (value.NODE_ENV === 'production' && !value.INTERNAL_API_KEY) {
      context.addIssue({
        code: 'custom',
        path: ['INTERNAL_API_KEY'],
        message: 'Required in production',
      })
    }
  })

export function readRuntimeEnv(source: NodeJS.ProcessEnv = process.env) {
  const result = schema.safeParse(source)
  if (!result.success) {
    // Field names only. Validation messages and env values can contain secrets.
    const names = [
      ...new Set(result.error.issues.map((issue) => String(issue.path[0] ?? 'environment'))),
    ].sort()
    throw new Error(`Invalid runtime configuration: ${names.join(', ')}`)
  }
  return result.data
}
