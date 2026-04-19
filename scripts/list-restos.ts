
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const restaurants = await prisma.restaurant.findMany({
    select: {
      id: true,
      nom: true,
      slug: true,
      email: true,
      plan: true,
      active: true
    }
  });
  console.log(JSON.stringify(restaurants, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
