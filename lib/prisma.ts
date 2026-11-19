import { PrismaClient } from "@prisma/client";

// Lazy Prisma client: importing this module must NOT connect to the DB,
// so `next build` succeeds with no DATABASE_URL configured.
// getPrisma() throws a clear error only when data is actually requested.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not configured. Set it in .env (see .env.example) and run `npx prisma db push` + `npm run db:seed`."
    );
  }
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  return globalForPrisma.prisma;
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
