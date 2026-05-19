// 기존 Product 행에 destination→countryCode/regionCode 백필 (멱등, 재실행 안전)
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { mapDestination, REGION_META } from "../src/lib/regions";
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
  const perRegion = new Map<string, number>();

  for (const p of products) {
    const codes = mapDestination(p.destination);
    if (!codes) {
      const key = (p.destination ?? "").trim() || "(빈 값)";
      unmapped.set(key, (unmapped.get(key) ?? 0) + 1);
      continue;
    }
    perRegion.set(codes.regionCode, (perRegion.get(codes.regionCode) ?? 0) + 1);

    if (p.countryCode === codes.countryCode && p.regionCode === codes.regionCode) {
      unchanged++;
      continue;
    }
    await prisma.product.update({
      where: { id: p.id },
      data: { countryCode: codes.countryCode, regionCode: codes.regionCode },
    });
    mapped++;
  }

  console.log(`총 상품: ${products.length}건`);
  console.log(`갱신: ${mapped}건 | 이미 일치(스킵): ${unchanged}건`);

  console.log("\n=== 매핑 결과 (regionCode별) ===");
  for (const code of [...perRegion.keys()].sort(
    (a, b) => (REGION_META[a]?.displayOrder ?? 999) - (REGION_META[b]?.displayOrder ?? 999)
  )) {
    const m = REGION_META[code];
    console.log(`${code} (${m?.countryName} ${m?.regionName}): ${perRegion.get(code)}건`);
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
