import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Ver todos los tenders (limit 10)
  const allTenders = await prisma.tender.findMany({
    take: 10,
  });
  console.log('Todos los tenders:', allTenders);

  // Ver tenders del BOE
  const boeTenders = await prisma.tender.findMany({
    where: { source: 'BOE' },
    select: {
      title: true,
      description: true,
      keywords: true,
    },
    take: 10,
  });
  console.log('Tenders del BOE:', boeTenders);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
