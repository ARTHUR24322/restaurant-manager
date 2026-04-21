import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const configs = await prisma.systemConfig.findMany()
  console.log('System Configs:', configs)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
