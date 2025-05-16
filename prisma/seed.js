import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');
  
  // Update existing users with 0 credits to have 3 credits
  const updatedUsers = await prisma.user.updateMany({
    where: {
      credits: 0
    },
    data: {
      credits: 5
    }
  });
  
  console.log(`Updated ${updatedUsers.count} existing users to have 3 credits`);
  
  console.log('Seed completed successfully ✅');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 