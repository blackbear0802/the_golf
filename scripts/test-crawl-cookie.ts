// [임시] 쿠키 기반 밴드 크롤 테스트 러너 — 공식 API 키 발급 전 전체 파이프라인 검증용
// 사용: npx tsx scripts/test-crawl-cookie.ts <bandId> [--commit] [--limit=N]
//   쿠키: scripts/band_cookie_secret.txt (gitignore됨) 또는 환경변수 BAND_COOKIE
//   기본은 dry-run(파싱 결과만 출력). --commit 줘야 운영 DB에 실제 상품 생성.
import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/lib/db";
import { parseProduct } from "../src/lib/claude-parser";
import {
  loadOperators,
  stripContacts,
  stripContactsFromArray,
  formatOperatorLine,
} from "../src/lib/contact-replacer";
import { storeFromUrl } from "../src/lib/media-storage";
import { classifyImage } from "../src/lib/media-classifier";
import {
  fetchPostList,
  fetchPostDetail,
  BandAuthError,
} from "./_band-cookie-client";

const MAX_IMAGES_PER_POST = 20;
const MAX_VIDEOS_PER_POST = 5;

function readCookie(): string {
  const file = join(__dirname, "band_cookie_secret.txt");
  if (existsSync(file)) {
    const c = readFileSync(file, "utf8").trim();
    if (c) return c;
  }
  const env = process.env.BAND_COOKIE?.trim();
  if (env) return env;
  throw new Error(
    "쿠키 없음: scripts/band_cookie_secret.txt 파일을 만들거나 BAND_COOKIE 환경변수를 설정하세요."
  );
}

function dbHost(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)";
  } catch {
    return "(unparseable)";
  }
}

async function main() {
  const args = process.argv.slice(2);
  const commit = args.includes("--commit");
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Math.max(1, parseInt(limitArg.split("=")[1], 10) || 2) : 2;
  const bandId = args.find((a) => !a.startsWith("--"));

  if (!bandId) {
    console.error(
      "사용법: npx tsx scripts/test-crawl-cookie.ts <bandId> [--commit] [--limit=N]"
    );
    process.exit(1);
  }

  const cookie = readCookie();

  console.log("─".repeat(60));
  console.log(`모드      : ${commit ? "★ COMMIT (운영 DB에 실제 상품 생성)" : "DRY-RUN (출력만, DB 미변경)"}`);
  console.log(`대상 밴드 : ${bandId}`);
  console.log(`DB 호스트 : ${dbHost()}`);
  console.log(`최대 건수 : ${limit}`);
  console.log("─".repeat(60));

  let posts;
  try {
    const res = await fetchPostList(bandId, cookie);
    posts = res.posts;
  } catch (err) {
    if (err instanceof BandAuthError) {
      console.error(
        `\n✗ 쿠키 인증 실패 (status=${err.statusCode}). band.us 재로그인 후 쿠키를 갱신하세요.`
      );
      console.error(err.bodySnippet.slice(0, 200));
      process.exit(1);
    }
    throw err;
  }
  console.log(`목록에서 발견한 게시글: ${posts.length}건`);

  const existing = await prisma.product.findMany({
    where: { bandPostId: { in: posts.map((p) => p.id) } },
    select: { bandPostId: true },
  });
  const seen = new Set(existing.map((e) => e.bandPostId).filter(Boolean) as string[]);
  const targets = posts.filter((p) => !seen.has(p.id)).slice(0, limit);
  console.log(`신규 후보(중복 제외): ${targets.length}건 처리\n`);

  const operators = await loadOperators();
  const operatorLine = formatOperatorLine(operators);

  let imported = 0;
  let skipped = 0;
  let failed = 0;
  const createdIds: string[] = [];

  for (const post of targets) {
    console.log(`▶ post ${post.id}  ${post.url}`);
    try {
      const detail = await fetchPostDetail(bandId, post.id, cookie);
      const cleaned = stripContacts(detail.text);
      if (!cleaned) {
        skipped++;
        console.log("  · 건너뜀: 본문 비어있음\n");
        continue;
      }

      const parsed = await parseProduct(cleaned);
      if (!parsed) {
        skipped++;
        console.log("  · 건너뜀: Claude 파싱 실패/필수값 부족\n");
        continue;
      }

      const includedFinal = [
        ...stripContactsFromArray(parsed.included),
        ...(operatorLine ? [`담당: ${operatorLine}`] : []),
      ];
      const excludedFinal = stripContactsFromArray(parsed.excluded);

      console.log(
        `  파싱 결과: ${parsed.destination} / ${parsed.golfCourse ?? "-"} / ` +
          `출발 ${parsed.departureDate} / ${parsed.nights}박 / ` +
          `${parsed.price.toLocaleString()}원 / 정원 ${parsed.capacity} / ` +
          `마감 ${parsed.deadline ?? "-"}`
      );
      console.log(
        `  포함 ${includedFinal.length} / 불포함 ${excludedFinal.length} / ` +
          `이미지 ${detail.imageUrls.length} / 영상 ${detail.youtubeUrls.length}`
      );

      if (!commit) {
        console.log("  (dry-run: DB 미생성)\n");
        imported++;
        continue;
      }

      await prisma.bandCrawledData.upsert({
        where: { sourceUrl: detail.url },
        create: { sourceUrl: detail.url, content: detail.text.slice(0, 50000), processed: "in_progress" },
        update: { content: detail.text.slice(0, 50000), processed: "in_progress" },
      });

      const created = await prisma.product.create({
        data: {
          destination: parsed.destination,
          golfCourse: parsed.golfCourse,
          departureDate: new Date(`${parsed.departureDate}T00:00:00.000Z`),
          nights: parsed.nights,
          price: parsed.price,
          capacity: parsed.capacity,
          deadline: parsed.deadline
            ? new Date(`${parsed.deadline}T00:00:00.000Z`)
            : null,
          included: includedFinal,
          excluded: excludedFinal,
          sourceUrl: detail.url,
          rawText: detail.text,
          autoImported: true,
          bandPostId: post.id,
        },
      });

      const mediaRows: Array<{
        productId: string;
        type: "golf" | "accommodation" | "dining" | "youtube";
        url: string;
        order: number;
      }> = [];
      const imageUrls = detail.imageUrls.slice(0, MAX_IMAGES_PER_POST);
      for (let i = 0; i < imageUrls.length; i++) {
        const stored = await storeFromUrl(imageUrls[i]);
        mediaRows.push({
          productId: created.id,
          type: classifyImage(imageUrls[i], null, detail.text),
          url: stored,
          order: i,
        });
      }
      const videoUrls = detail.youtubeUrls.slice(0, MAX_VIDEOS_PER_POST);
      for (let i = 0; i < videoUrls.length; i++) {
        mediaRows.push({ productId: created.id, type: "youtube", url: videoUrls[i], order: i });
      }
      if (mediaRows.length > 0) {
        await prisma.productMedia.createMany({ data: mediaRows });
      }

      await prisma.bandCrawledData.update({
        where: { sourceUrl: detail.url },
        data: { processed: "done", processedAt: new Date() },
      });

      createdIds.push(created.id);
      imported++;
      console.log(`  ✓ 상품 생성: ${created.id}\n`);
    } catch (err) {
      if (err instanceof BandAuthError) {
        console.error(
          `\n✗ 쿠키 인증 실패 (status=${err.statusCode}). 재로그인 후 쿠키 갱신 필요.`
        );
        process.exit(1);
      }
      failed++;
      const reason = err instanceof Error ? err.message : String(err);
      console.log(`  ✗ 실패: ${reason.slice(0, 200)}\n`);
    }
  }

  console.log("─".repeat(60));
  console.log(
    `처리=${imported}  건너뜀=${skipped}  실패=${failed}` +
      (commit ? `  생성=${createdIds.length}` : "  (dry-run)")
  );
  if (createdIds.length > 0) {
    console.log("\n생성된 상품 ID:");
    createdIds.forEach((id) => console.log(`  ${id}`));
    console.log(
      "\n삭제하려면(Prisma Studio 또는):\n" +
        `  prisma.product.deleteMany({ where: { id: { in: [${createdIds
          .map((i) => `"${i}"`)
          .join(", ")}] } } })`
    );
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
