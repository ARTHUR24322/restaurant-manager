
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PLAN_PRICES: Record<string, number> = {
  "ESSAI": 0,
  "STANDARD": 50,
  "PRO": 65,
  "PLATINUM": 100
};

async function main() {
  console.log("Starting migration: Updating monthlyPrice for existing restaurants...");
  
  const restaurants = await prisma.restaurant.findMany();
  
  for (const resto of restaurants) {
    const defaultPrice = PLAN_PRICES[resto.plan] || 0;
    if (resto.monthlyPrice === 0 && defaultPrice > 0) {
      console.log(`Updating ${resto.nom} (${resto.plan}) -> $${defaultPrice}`);
      await prisma.restaurant.update({
        where: { id: resto.id },
        data: { monthlyPrice: defaultPrice }
      });
    } else {
      console.log(`Skipping ${resto.nom} (${resto.plan}) - current price: $${resto.monthlyPrice}`);
    }
  }
  
  console.log("Migration completed.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
