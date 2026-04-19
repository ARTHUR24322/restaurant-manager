const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({});

async function main() {
  console.log('Seeding initial data...');

  // 1. Create Default Restaurant
  const restaurantId = "resto-99-default";
  const restaurant = await prisma.restaurant.upsert({
    where: { id: restaurantId },
    update: {},
    create: {
      id: restaurantId,
      nom: "Restaurant Démo SmartResto",
      email: "demo@smartresto.com",
      logoUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=200&h=200&auto=format&fit=crop",
      adminPassword: "demo",
      active: true,
      plan: "PREMIUM",
      subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  console.log('Restaurant created/found:', restaurant.nom);

  // 2. Create Initial Plats
  const plats = [
    {
      id: "cl-1",
      restaurantId: restaurantId,
      nom: "Capitaine Grillé",
      description: "Le grand classique du fleuve, grillé à la braise.",
      prixUsd: 25.0,
      image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=800",
      categorie: "PLAT",
    },
    {
      id: "cl-2",
      restaurantId: restaurantId,
      nom: "Poulet Mayo",
      description: "Célèbre préparation kinoise, onctueuse et pimentée.",
      prixUsd: 18.0,
      image: "https://plus.unsplash.com/premium_photo-1694850980436-1e967a57a80b?q=80&w=800",
      categorie: "PLAT",
    },
  ];

  for (const plat of plats) {
    await prisma.plat.upsert({
      where: { id: plat.id },
      update: {},
      create: plat,
    });
  }
  console.log('Initial plats created/found.');

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
