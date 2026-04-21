import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('--- Initialisation de la sécurité Super-Admin ---')
  
  // 1. Initialiser le PIN à 123456 (temporairement pour vous laisser entrer)
  await prisma.systemConfig.upsert({
    where: { key: 'admin_pin' },
    update: { value: '123456' },
    create: { key: 'admin_pin', value: '123456' }
  })
  console.log('✅ PIN Admin configuré sur : 123456')

  // 2. Initialiser la version de session
  await prisma.systemConfig.upsert({
    where: { key: 'admin_session_version' },
    update: { value: '1' },
    create: { key: 'admin_session_version', value: '1' }
  })
  console.log('✅ Version de session initialisée.')
  
  console.log('\n--- TERMINÉ ---')
  console.log('Vous pouvez maintenant vous connecter avec le code 123456.')
  console.log('Pensez à le changer dans l\'onglet "System" une fois connecté !')
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
