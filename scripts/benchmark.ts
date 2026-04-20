
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function benchmark() {
  console.log("Starting benchmarks...");
  
  const startTotal = Date.now();
  
  // Test 1: Simple query
  const start1 = Date.now();
  const restoCount = await prisma.restaurant.count();
  const end1 = Date.now();
  console.log(`Test 1: Restaurant count (${restoCount}) - ${end1 - start1}ms`);
  
  // Test 2: Query with includes
  const start2 = Date.now();
  const sampleResto = await prisma.restaurant.findFirst({
    include: { plats: { take: 5 } }
  });
  const end2 = Date.now();
  console.log(`Test 2: Restaurant findFirst with 5 plats - ${end2 - start2}ms`);

  // Test 3: Recent orders for a sample restaurant
  if (sampleResto) {
    const start3 = Date.now();
    const orders = await prisma.commande.findMany({
      where: { restaurantId: sampleResto.id },
      take: 20,
      orderBy: { createdAt: 'desc' }
    });
    const end3 = Date.now();
    console.log(`Test 3: getRecentCommandes (20 orders) - ${end3 - start3}ms`);
  }
  
  const endTotal = Date.now();
  console.log(`\nTotal benchmark time: ${endTotal - startTotal}ms`);
  
  await prisma.$disconnect();
}

benchmark().catch(console.error);
