import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const fixtures = [
    {
      clerkUserId: 'clerk_seed_gerson',
      email: 'gerson@pulsogg.gg',
      username: 'gerson',
      displayName: 'Gerson García',
      role: UserRole.ADMIN,
    },
    {
      clerkUserId: 'clerk_seed_faker',
      email: 'faker.mx@example.com',
      username: 'faker_mx',
      displayName: 'Faker MX',
      role: UserRole.PLAYER,
    },
    {
      clerkUserId: 'clerk_seed_caps',
      email: 'caps@example.com',
      username: 'caps_lat',
      displayName: 'Caps LAT',
      role: UserRole.PLAYER,
    },
  ];

  for (const fixture of fixtures) {
    const user = await prisma.user.upsert({
      where: { clerkUserId: fixture.clerkUserId },
      update: {},
      create: fixture,
    });
    console.log(`  ✓ ${user.username.padEnd(12)} → id: ${user.id}`);
  }

  const total = await prisma.user.count();
  console.log(`\nTotal users in DB: ${total}`);
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
