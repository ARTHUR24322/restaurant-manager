import { prisma } from "./src/lib/prisma";

async function main() {
  console.log("Testing connection...");
  const count = await (prisma as any).restaurant.count();
  console.log("Restaurants count:", count);
}
main().catch(console.error).finally(() => prisma.$disconnect());
