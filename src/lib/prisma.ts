import { PrismaClient } from "@prisma/client";

/**
 * --- PRISMA CLIENT SAAS (PostgreSQL / Supabase) ---
 * Singleton pattern pour mutualiser les connexions vers le Pooler Supabase.
 *
 * Paramètres ajoutés pour la résilience réseau :
 * - connection_limit=5  : Limite les connexions simultanées (évite la saturation du pooler)
 * - pool_timeout=20     : Abandon au bout de 20s si aucune connexion disponible
 * - connect_timeout=10  : Abandon de la connexion initiale au bout de 10s
 *
 * Ces paramètres évitent les blocages infinis lors de coupures
 * Supabase (erreurs P1017 / P1001).
 */

function buildDatabaseUrl(): string {
  const base = process.env.DATABASE_URL ?? "";
  if (!base) return base;
  try {
    const url = new URL(base);
    if (!url.searchParams.has("connection_limit"))
      url.searchParams.set("connection_limit", "5");
    if (!url.searchParams.has("pool_timeout"))
      url.searchParams.set("pool_timeout", "20");
    if (!url.searchParams.has("connect_timeout"))
      url.searchParams.set("connect_timeout", "10");
    return url.toString();
  } catch {
    return base;
  }
}

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: { url: buildDatabaseUrl() },
    },
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
