import { createRequire } from 'module';
import 'dotenv/config';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('../../prisma/generated/index.js');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});
export default prisma;
