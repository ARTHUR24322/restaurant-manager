import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Connecting to database via pooler to add telephone column...");
    await prisma.$executeRawUnsafe(`ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "telephone" TEXT;`);
    console.log("Added telephone to Restaurant table.");
    
    await prisma.$executeRawUnsafe(`ALTER TABLE "DemandeAbonnement" ADD COLUMN IF NOT EXISTS "telephone" TEXT;`);
    console.log("Added telephone to DemandeAbonnement table.");
    
    console.log("Migration complete!");
  } catch (error) {
    console.error("Database migration error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
