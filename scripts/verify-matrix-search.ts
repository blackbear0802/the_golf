// §6 검증 — 매트릭스 셀 집계 == /search WHERE 건수 일치 단언(전 셀 + 샘플 출력)
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { REGION_META, orderedRegionCodes } from "../src/lib/regions";
import "dotenv/config";

const BASE_YEAR = 2026;

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  // 매트릭스 측 집계 (packages/page.tsx와 동일 WHERE + JS 버킷)
  const products = await prisma.product.findMany({
    where: {
      regionCode: { not: null },
      departureDate: {
        gte: new Date(Date.UTC(BASE_YEAR, 0, 1)),
        lt: new Date(Date.UTC(BASE_YEAR + 1, 0, 1)),
      },
    },
    select: { regionCode: true, departureDate: true },
  });
  const counts: Record<string, Record<number, number>> = {};
  for (const p of products) {
    if (!p.regionCode) continue;
    const m = p.departureDate.getUTCMonth() + 1;
    (counts[p.regionCode] ??= {})[m] = (counts[p.regionCode]?.[m] ?? 0) + 1;
  }

  let checked = 0;
  let mismatches = 0;
  const samples: string[] = [];

  for (const regionCode of orderedRegionCodes()) {
    const meta = REGION_META[regionCode];
    for (let m = 1; m <= 12; m++) {
      const matrixN = counts[regionCode]?.[m] ?? 0;
      // /search?countryCode=&regionCode=&month= 와 동일 WHERE
      const searchN = await prisma.product.count({
        where: {
          countryCode: meta.countryCode,
          regionCode,
          departureDate: {
            gte: new Date(Date.UTC(BASE_YEAR, m - 1, 1)),
            lt: new Date(Date.UTC(BASE_YEAR, m, 1)),
          },
        },
      });
      if (matrixN !== searchN) {
        mismatches++;
        console.error(
          `❌ ${regionCode} ${BASE_YEAR}-${m}: 매트릭스 ${matrixN} ≠ /search ${searchN}`
        );
      }
      if (matrixN > 0) {
        checked++;
        if (samples.length < 3) {
          samples.push(
            `${meta.countryName} ${meta.regionName} ${BASE_YEAR}-${String(m).padStart(2, "0")}: ${matrixN}건 (일치)`
          );
        }
      }
    }
  }

  console.log(`활성 셀 ${checked}개 검사 · 불일치 ${mismatches}개`);
  console.log("샘플 3셀:");
  samples.forEach((s) => console.log(`  - ${s}`));

  await prisma.$disconnect();
  if (mismatches > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
