import { PrismaClient } from '../../src/generated/prisma';
import { PrismaPg } from "@prisma/adapter-pg";
import {Pool} from "pg";
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
console.log('🧠 [DATABASE_URL] is:', connectionString ? 'FOUND' : 'MISSING');

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
