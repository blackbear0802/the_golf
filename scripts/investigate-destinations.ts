// 매트릭스 설계용 일회성 조사 — destination 전수 + 출발 연·월 분포 출력
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const products = await prisma.product.findMany({
    select: { destination: true, departureDate: true, departureLabel: true },
  });

  const total = products.length;
  console.log(`총 상품 수: ${total}\n`);

  // 1. destination distinct + 건수 (출발 연·월 분포 동반)
  const byDest = new Map<
    string,
    { count: number; months: Map<string, number> }
  >();
  let emptyDest = 0;
  const yearCount = new Map<number, number>();

  for (const p of products) {
    const dest = (p.destination ?? "").trim();
    if (!dest) emptyDest++;
    const key = dest || "(빈 값)";
    if (!byDest.has(key)) byDest.set(key, { count: 0, months: new Map() });
    const entry = byDest.get(key)!;
    entry.count++;

    const d = p.departureDate;
    if (d) {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const ym = `${y}-${m}`;
      entry.months.set(ym, (entry.months.get(ym) ?? 0) + 1);
      yearCount.set(y, (yearCount.get(y) ?? 0) + 1);
    }
  }

  console.log(`distinct destination: ${byDest.size}개 | 빈 destination: ${emptyDest}건\n`);
  console.log("=== destination별 건수 / 출발 연-월 분포 ===");
  const sorted = [...byDest.entries()].sort((a, b) => b[1].count - a[1].count);
  for (const [dest, info] of sorted) {
    const months = [...info.months.entries()]
      .sort()
      .map(([ym, c]) => `${ym}:${c}`)
      .join(" ");
    console.log(`[${info.count}] ${dest}`);
    console.log(`     ${months || "(출발일 없음)"}`);
  }

  // 2. 연도 커버리지 (기준연도 1개 선택 근거)
  console.log("\n=== 출발 연도별 상품 수 ===");
  for (const [y, c] of [...yearCount.entries()].sort()) {
    console.log(`${y}: ${c}건`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
