const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const employes = await prisma.employe.groupBy({
    by: ['restaurantId', 'codePin'],
    _count: { id: true },
    having: { id: { _count: { gt: 1 } } }
  });
  console.log(employes);

  // If there are duplicates, maybe rename codePin to avoid constraint error during push
  for (const dupe of employes) {
    console.log(`Fixing duplicate PIN ${dupe.codePin} in restaurant ${dupe.restaurantId}`);
    const targets = await prisma.employe.findMany({
      where: { restaurantId: dupe.restaurantId, codePin: dupe.codePin },
      orderBy: { createdAt: 'asc' }
    });
    // Skip the first one, mutate the others
    for (let i = 1; i < targets.length; i++) {
        const emp = targets[i];
        const newPin = (parseInt(emp.codePin) + i).toString().padStart(emp.codePin.length, '0');
        await prisma.employe.update({
            where: { id: emp.id },
            data: { codePin: newPin }
        });
        console.log(`Changed PIN for ${emp.nom} to ${newPin}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
