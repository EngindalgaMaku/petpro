import { PrismaClient } from "@prisma/client";
import { seedDemo } from "../lib/demo-seed";

const prisma = new PrismaClient();

seedDemo(prisma)
  .catch((e) => {
    console.error("❌ Seed hatası:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
