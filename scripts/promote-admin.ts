// 특정 이메일의 사용자 role을 admin으로 승격 (인자: 이메일)
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("사용법: tsx scripts/promote-admin.ts <email>");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const user = await prisma.user.update({
    where: { email },
    data: { role: "admin" },
  });

  console.log(`✓ ${user.email} → role: ${user.role}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
