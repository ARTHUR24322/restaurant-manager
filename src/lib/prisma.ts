import { PrismaClient } from "@prisma/client";

/**
 * --- PRISMA CLIENT SAAS (PostgreSQL / Supabase) ---
 * Singleton pattern pour mutualiser les connexions vers le Pooler Supabase.
 */

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
