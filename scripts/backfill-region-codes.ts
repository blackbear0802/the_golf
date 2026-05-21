// 기존 Product 행에 destination→countryCode/regionCode 백필 (멱등, 재실행 안전)
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parseDestination } from "../src/lib/regions";
import "dotenv/config";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const products = await prisma.product.findMany({
    select: { id: true, destination: true, countryCode: true, regionCode: true },
  });

  let mapped = 0;
  let unchanged = 0;
  const unmapped = new Map<string, number>();
  const perRegion = new Map<string, { count: number; label: string }>();

  for (const p of products) {
    const info = parseDestination(p.destination);
    if (!info) {
      const key = (p.destination ?? "").trim() || "(빈 값)";
      unmapped.set(key, (unmapped.get(key) ?? 0) + 1);
      continue;
    }
    const entry = perRegion.get(info.regionCode) ?? {
      count: 0,
      label: `${info.countryName} ${info.regionName}`,
    };
    entry.count++;
    perRegion.set(info.regionCode, entry);

    if (p.countryCode === info.countryCode && p.regionCode === info.regionCode) {
      unchanged++;
      continue;
    }
    await prisma.product.update({
      where: { id: p.id },
      data: { countryCode: info.countryCode, regionCode: info.regionCode },
    });
    mapped++;
  }

  console.log(`총 상품: ${products.length}건`);
  console.log(`갱신: ${mapped}건 | 이미 일치(스킵): ${unchanged}건`);

  console.log("\n=== 매핑 결과 (regionCode별) ===");
  for (const [code, { count, label }] of [...perRegion.entries()].sort()) {
    console.log(`${code} (${label}): ${count}건`);
  }

  console.log("\n=== 미매핑 destination (countryCode/regionCode = null 유지) ===");
  if (unmapped.size === 0) {
    console.log("(없음 — 전량 매핑)");
  } else {
    for (const [dest, c] of [...unmapped.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`[${c}] ${dest}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
