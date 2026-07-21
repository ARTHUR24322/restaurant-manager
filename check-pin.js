const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const config = await prisma.systemConfig.findUnique({ where: { key: "admin_pin" } });
  console.log(config);
}

main().finally(() => prisma.$disconnect());
