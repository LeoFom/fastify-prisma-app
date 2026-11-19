import "dotenv/config";
import type { PrismaConfig } from "prisma";
// import { env } from "prisma/config";
import 'dotenv/config';

export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",

  },
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    // url: env("DATABASE_URL"),
  },
} satisfies PrismaConfig;