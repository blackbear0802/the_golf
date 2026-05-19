// [임시] 밴드 글 본문 → 상품 변환 파이프라인 검증 러너 (공식 API 키 발급 전)
// 사용: npx tsx scripts/test-parse-pipeline.ts [파일경로] [--commit]
//   파일경로 생략 시 scripts/sample-post.txt 사용. 기본 dry-run.
//   --commit 줘야 운영 DB에 실제 상품 생성(테스트 식별용 sourceUrl=test://).
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
  const fileArg = args.find((a) => !a.startsWith("--"));
  const filePath = fileArg
    ? fileArg
    : join(__dirname, "sample-post.txt");

  if (!existsSync(filePath)) {
    console.error(`파일 없음: ${filePath}`);
    process.exit(1);
  }
  const rawText = readFileSync(filePath, "utf8");

  console.log("─".repeat(60));
  console.log(`모드     : ${commit ? "★ COMMIT (운영 DB에 실제 상품 생성)" : "DRY-RUN (출력만)"}`);
  console.log(`입력     : ${filePath} (${rawText.length}자)`);
  console.log(`DB 호스트: ${dbHost()}`);
  console.log("─".repeat(60));

  const cleaned = stripContacts(rawText);
  console.log(`\n[1] 연락처 제거 후: ${cleaned.length}자`);
  if (!cleaned.trim()) {
    console.error("본문이 비어있어 중단합니다.");
    process.exit(1);
  }

  console.log("[2] Claude 파싱 중...");
  const parsed = await parseProduct(cleaned);
  if (!parsed) {
    console.error("✗ 파싱 실패 또는 필수값(목적지/출발일) 부족 → null 반환");
    process.exit(1);
  }

  const operators = await loadOperators();
  const operatorLine = formatOperatorLine(operators);
  const includedFinal = [
    ...stripContactsFromArray(parsed.included),
    ...(operatorLine ? [`담당: ${operatorLine}`] : []),
  ];
  const excludedFinal = stripContactsFromArray(parsed.excluded);

  console.log("\n[3] 파싱 결과");
  console.log(`  목적지   : ${parsed.destination}`);
  console.log(`  골프장   : ${parsed.golfCourse ?? "-"}`);
  console.log(`  출발일   : ${parsed.departureDate}${parsed.departureLabel ? " (내부 정렬키)" : ""}`);
  console.log(`  일정표기 : ${parsed.departureLabel ?? "(단일 날짜 — 라벨 없음)"}`);
  console.log(`  박       : ${parsed.nights}`);
  console.log(`  가격     : ${parsed.price.toLocaleString()}원`);
  console.log(`  정원     : ${parsed.capacity}`);
  console.log(`  마감     : ${parsed.deadline ?? "-"}`);
  console.log(`  포함(${includedFinal.length}): ${includedFinal.join(" | ")}`);
  console.log(`  불포함(${excludedFinal.length}): ${excludedFinal.join(" | ")}`);

  if (!commit) {
    console.log("\n(dry-run: DB 미생성. 결과 확인 후 --commit 으로 실제 생성)");
    await prisma.$disconnect();
    return;
  }

  const sourceUrl = `test://sample/${Date.now()}`;
  const created = await prisma.product.create({
    data: {
      destination: parsed.destination,
      golfCourse: parsed.golfCourse,
      departureDate: new Date(`${parsed.departureDate}T00:00:00.000Z`),
      departureLabel: parsed.departureLabel,
      nights: parsed.nights,
      price: parsed.price,
      capacity: parsed.capacity,
      deadline: parsed.deadline
        ? new Date(`${parsed.deadline}T00:00:00.000Z`)
        : null,
      included: includedFinal,
      excluded: excludedFinal,
      sourceUrl,
      rawText,
      autoImported: true,
    },
  });

  console.log(`\n✓ 상품 생성: ${created.id}  (sourceUrl=${sourceUrl})`);
  console.log(
    `삭제: prisma.product.delete({ where: { id: "${created.id}" } })  또는 npm run db:studio`
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
