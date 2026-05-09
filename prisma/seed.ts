import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Placeholder seed — extend when modules are implemented.
  // For now we just verify the connection works.
  const userCount = await prisma.user.count();
  console.log(`Existing users: ${userCount}`);

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
