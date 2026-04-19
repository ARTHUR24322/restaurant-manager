import { PrismaClient } from "@prisma/client";

/**
 * --- REAL PRISMA CLIENT SAAS (SQLite Persistence) ---
 * Ce fichier remplace désormais le Mock en mémoire.
 * Chaque donnée est liée à son restaurant respectif dans dev.db.
 */

// Singleton pattern pour éviter d'ouvrir trop de connexions lors du développement (HMR)
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
