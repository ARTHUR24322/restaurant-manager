
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

async function main() {
  const password = "admin";
  const hashedPassword = await hashPassword(password);
  
  const emails = ["demo@smartresto.com", "kisumbulearthur@gmail.com"];
  
  for (const email of emails) {
    console.log(`Resetting passwords for all restaurants with email: ${email} to 'admin'`);
    await prisma.restaurant.updateMany({
      where: { email },
      data: { adminPassword: hashedPassword }
    });
  }
  
  console.log("Passwords reset successfully.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
