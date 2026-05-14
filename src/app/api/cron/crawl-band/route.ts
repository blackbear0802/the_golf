// Vercel Cron 진입점 — 네이버 밴드 크롤링 → 자동 상품 등록
// 보안: Authorization: Bearer ${CRON_SECRET} 헤더 필수.
// 흐름: 활성화 확인 → 쿠키/밴드ID 로드 → 글 목록 → 신규 글만
//   → 상세 fetch → Claude 파싱 → 연락처 치환 → Product+Media 생성
//   → BandCrawledData에 원문 저장 → 결과를 AppConfig에 기록.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  APP_CONFIG_KEYS,
  getConfigMany,
  setConfigMany,
  type AppConfigKey,
} from "@/lib/app-config";
import {
  BandAuthError,
  fetchPostList,
  fetchPostDetail,
  type BandPostDetail,
} from "@/lib/band-client";
import { parseProduct } from "@/lib/claude-parser";
import {
  loadOperators,
  stripContacts,
  stripContactsFromArray,
  formatOperatorLine,
} from "@/lib/contact-replacer";
import { storeFromUrl } from "@/lib/media-storage";
import { classifyImage } from "@/lib/media-classifier";

export const maxDuration = 300; // Vercel Pro 한도, 5분
export const dynamic = "force-dynamic";

const MAX_POSTS_PER_RUN = 5; // 한 번 실행에 최대 처리 건수 (Claude 비용 + 시간 가드)
const MAX_IMAGES_PER_POST = 20;
const MAX_VIDEOS_PER_POST = 5;

export async function GET(req: Request) {
  // 1) CRON_SECRET 검증
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startedAt = new Date();

  try {
    // 2) 설정 로드
    const cfg = await getConfigMany([
      APP_CONFIG_KEYS.crawlEnabled,
      APP_CONFIG_KEYS.bandId,
      APP_CONFIG_KEYS.bandCookies,
    ]);

    if (cfg.crawlEnabled !== "true") {
      return NextResponse.json({ skipped: "disabled" });
    }
    if (!cfg.bandId || !cfg.bandCookies) {
      await recordFailure(startedAt, "밴드 ID 또는 쿠키가 등록되지 않았습니다.");
      return NextResponse.json({ error: "missing_credentials" }, { status: 400 });
    }

    // 3) 글 목록
    const { posts } = await fetchPostList(cfg.bandId, cfg.bandCookies);

    // 4) 이미 등록된 글 제외
    const existing = await prisma.product.findMany({
      where: { bandPostId: { in: posts.map((p) => p.id) } },
      select: { bandPostId: true },
    });
    const seenIds = new Set(existing.map((e) => e.bandPostId).filter(Boolean) as string[]);
    const newPosts = posts.filter((p) => !seenIds.has(p.id)).slice(0, MAX_POSTS_PER_RUN);

    // 5) 담당자 정보 로드 (한 번만)
    const operators = await loadOperators();
    const operatorLine = formatOperatorLine(operators);

    // 6) 게시글별 처리 (1건 실패가 다른 건 영향 없도록 격리)
    let imported = 0;
    let skipped = 0;
    let failed = 0;
    const errors: { postId: string; reason: string }[] = [];

    for (const post of newPosts) {
      let detail: BandPostDetail | null = null;
      try {
        detail = await fetchPostDetail(cfg.bandId, post.id, cfg.bandCookies);

        // 원문은 항상 저장 (검수/재처리용)
        await prisma.bandCrawledData.upsert({
          where: { sourceUrl: detail.url },
          create: {
            sourceUrl: detail.url,
            content: detail.text || detail.rawHtml.slice(0, 50000),
            processed: "in_progress",
          },
          update: {
            content: detail.text || detail.rawHtml.slice(0, 50000),
            processed: "in_progress",
          },
        });

        const cleanedForLLM = stripContacts(detail.text);
        if (!cleanedForLLM) {
          skipped++;
          await markCrawled(detail.url, "failed");
          errors.push({ postId: post.id, reason: "본문 비어있음" });
          continue;
        }

        const parsed = await parseProduct(cleanedForLLM);
        if (!parsed) {
          skipped++;
          await markCrawled(detail.url, "failed");
          errors.push({ postId: post.id, reason: "Claude 파싱 실패/필수값 부족" });
          continue;
        }

        const includedFinal = [
          ...stripContactsFromArray(parsed.included),
          ...(operatorLine ? [`담당: ${operatorLine}`] : []),
        ];
        const excludedFinal = stripContactsFromArray(parsed.excluded);

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

        // 미디어 등록
        const mediaRows: Array<{
          productId: string;
          type: "golf" | "accommodation" | "dining" | "youtube";
          url: string;
          order: number;
        }> = [];

        const imageUrls = detail.imageUrls.slice(0, MAX_IMAGES_PER_POST);
        for (let i = 0; i < imageUrls.length; i++) {
          const url = imageUrls[i];
          const stored = await storeFromUrl(url);
          const cat = classifyImage(url, null, detail.text);
          mediaRows.push({ productId: created.id, type: cat, url: stored, order: i });
        }

        const videoUrls = detail.youtubeUrls.slice(0, MAX_VIDEOS_PER_POST);
        for (let i = 0; i < videoUrls.length; i++) {
          mediaRows.push({
            productId: created.id,
            type: "youtube",
            url: videoUrls[i],
            order: i,
          });
        }

        if (mediaRows.length > 0) {
          await prisma.productMedia.createMany({ data: mediaRows });
        }

        await markCrawled(detail.url, "done");
        imported++;
      } catch (err) {
        if (err instanceof BandAuthError) throw err; // 외곽에서 처리
        failed++;
        const reason = err instanceof Error ? err.message : String(err);
        if (detail) await markCrawled(detail.url, "failed").catch(() => {});
        errors.push({ postId: post.id, reason: reason.slice(0, 200) });
      }
    }

    await setConfigMany({
      [APP_CONFIG_KEYS.lastCrawlAt]: startedAt.toISOString(),
      [APP_CONFIG_KEYS.lastCrawlSuccess]: "true",
      [APP_CONFIG_KEYS.lastCrawlNew]: String(imported),
      [APP_CONFIG_KEYS.lastCrawlError]: errors.length > 0 ? JSON.stringify(errors).slice(0, 500) : "",
    } as Partial<Record<AppConfigKey, string>>);

    return NextResponse.json({
      ok: true,
      totalListed: posts.length,
      newCandidates: newPosts.length,
      imported,
      skipped,
      failed,
      errors,
    });
  } catch (err) {
    if (err instanceof BandAuthError) {
      await setConfigMany({
        [APP_CONFIG_KEYS.cookieExpiredAt]: startedAt.toISOString(),
        [APP_CONFIG_KEYS.lastCrawlAt]: startedAt.toISOString(),
        [APP_CONFIG_KEYS.lastCrawlSuccess]: "false",
        [APP_CONFIG_KEYS.lastCrawlError]: `인증 실패 (status=${err.statusCode}). Cookie 헤더를 재등록하세요.`,
      } as Partial<Record<AppConfigKey, string>>);
      return NextResponse.json({ error: "auth_failed", status: err.statusCode }, { status: 401 });
    }

    const msg = err instanceof Error ? err.message : String(err);
    await recordFailure(startedAt, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function recordFailure(startedAt: Date, message: string) {
  await setConfigMany({
    [APP_CONFIG_KEYS.lastCrawlAt]: startedAt.toISOString(),
    [APP_CONFIG_KEYS.lastCrawlSuccess]: "false",
    [APP_CONFIG_KEYS.lastCrawlError]: message.slice(0, 500),
  } as Partial<Record<AppConfigKey, string>>);
}

async function markCrawled(sourceUrl: string, status: "done" | "failed") {
  await prisma.bandCrawledData.update({
    where: { sourceUrl },
    data: { processed: status, processedAt: new Date() },
  });
}
