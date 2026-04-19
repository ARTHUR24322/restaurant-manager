
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const visites = await prisma.visite.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      restaurant: {
        select: {
          nom: true,
          slug: true
        }
      }
    }
  });
  console.log(JSON.stringify(visites, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
