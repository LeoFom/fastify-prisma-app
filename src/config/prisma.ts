import { PrismaClient } from '@prisma/client';
import { PrismaPg } from "@prisma/adapter-pg";
import {Pool} from "pg";
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString, max: 5, connectionTimeoutMillis: 8000, idleTimeoutMillis: 10000 });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
