// 밴드 크롤러 핵심 로직 — 공식 Open API(OAuth) 기반. cron route와 어드민 수동 트리거가 공유.

import { prisma } from "@/lib/db";
import {
  APP_CONFIG_KEYS,
  getConfigMany,
  setConfigMany,
  type AppConfigKey,
} from "@/lib/app-config";
import {
  BandApiAuthError,
  fetchPosts,
  fetchPostDetail,
  postPermalink,
  type BandPostFull,
} from "@/lib/band-api-client";
import { refreshAccessToken, BandOAuthError } from "@/lib/band-oauth";
import { parseProduct } from "@/lib/claude-parser";
import { stripContacts, stripContactsFromArray } from "@/lib/contact-replacer";
import { cleanPostText } from "@/lib/clean-post-text";
import { storeFromUrl } from "@/lib/media-storage";
import { classifyImage } from "@/lib/media-classifier";
import { regionFieldsFor } from "@/lib/regions";

// 빠른등록과 동일한 기본 차단어. 어드민 설정(bodyBlocklist) 미설정 시 사용.
const DEFAULT_BODY_BLOCKLIST = ["담당자", "문의하기", "문의", "위더스골프"];

async function loadBodyBlocklist(): Promise<string[]> {
  const raw = await getConfigMany([APP_CONFIG_KEYS.bodyBlocklist]);
  const v = raw[APP_CONFIG_KEYS.bodyBlocklist];
  if (v === null) return DEFAULT_BODY_BLOCKLIST;
  return v.split("\n").map((s) => s.trim()).filter(Boolean);
}

const MAX_POSTS_PER_RUN = 5;
const MAX_IMAGES_PER_POST = 20;
const MAX_VIDEOS_PER_POST = 5;

export type BandCrawlSkipped =
  | { skipped: "disabled" }
  | { skipped: "missing_credentials"; diag?: string };

export type BandCrawlSuccess = {
  ok: true;
  totalListed: number;
  newCandidates: number;
  imported: number;
  skipped: number;
  failed: number;
  errors: { postId: string; reason: string }[];
};

export type BandCrawlAuthFailed = {
  ok: false;
  reason: "auth_failed";
  statusCode: number;
};

export type BandCrawlResult = BandCrawlSkipped | BandCrawlSuccess | BandCrawlAuthFailed;

type TokenState = { accessToken: string; refreshToken: string | null };

export async function runBandCrawl(startedAt: Date): Promise<BandCrawlResult> {
  try {
    const cfg = await getConfigMany([
      APP_CONFIG_KEYS.crawlEnabled,
      APP_CONFIG_KEYS.bandKey,
      APP_CONFIG_KEYS.bandAccessToken,
      APP_CONFIG_KEYS.bandRefreshToken,
    ]);

    if (cfg.crawlEnabled !== "true") {
      return { skipped: "disabled" };
    }
    if (!cfg.bandAccessToken || !cfg.bandKey) {
      const tokenLen = cfg.bandAccessToken?.length ?? -1;
      const keyLen = cfg.bandKey?.length ?? -1;
      const diag = `missing_credentials [tokenLen=${tokenLen} keyLen=${keyLen}]`;
      await recordFailure(startedAt, diag);
      return { skipped: "missing_credentials", diag };
    }

    const state: TokenState = {
      accessToken: cfg.bandAccessToken,
      refreshToken: cfg.bandRefreshToken,
    };
    const bandKey = cfg.bandKey;

    const { items } = await callWithRefresh((token) => fetchPosts(token, bandKey), state);

    const existing = await prisma.product.findMany({
      where: { bandPostId: { in: items.map((p) => p.postKey).filter(Boolean) } },
      select: { bandPostId: true },
    });
    const seenIds = new Set(
      existing.map((e) => e.bandPostId).filter(Boolean) as string[]
    );
    const newPosts = items
      .filter((p) => p.postKey && !seenIds.has(p.postKey))
      .slice(0, MAX_POSTS_PER_RUN);

    const blocklistTerms = await loadBodyBlocklist();

    let imported = 0;
    let skipped = 0;
    let failed = 0;
    const errors: { postId: string; reason: string }[] = [];

    for (const post of newPosts) {
      const sourceUrl = postPermalink(bandKey, post.postKey);
      let detail: BandPostFull | null = null;
      try {
        detail = await callWithRefresh(
          (token) => fetchPostDetail(token, bandKey, post.postKey),
          state
        );

        await prisma.bandCrawledData.upsert({
          where: { sourceUrl },
          create: {
            sourceUrl,
            content: detail.content.slice(0, 50000),
            processed: "in_progress",
          },
          update: {
            content: detail.content.slice(0, 50000),
            processed: "in_progress",
          },
        });

        // 빠른등록과 동일한 LLM 입력 정제: cleanPostText(HYPERLINK/band.us 잔재 제거) → stripContacts.
        const cleanedForLLM = stripContacts(cleanPostText(detail.content));
        if (!cleanedForLLM) {
          skipped++;
          await markCrawled(sourceUrl, "failed");
          errors.push({ postId: post.postKey, reason: "본문 비어있음" });
          continue;
        }

        const parsed = await parseProduct(cleanedForLLM);
        if (!parsed) {
          skipped++;
          await markCrawled(sourceUrl, "failed");
          errors.push({ postId: post.postKey, reason: "Claude 파싱 실패/필수값 부족" });
          continue;
        }

        // 담당자/연락처는 본문·included에서 노출하지 않는다(예약 화면에서만 표시).
        const includedFinal = stripContactsFromArray(parsed.included);
        const excludedFinal = stripContactsFromArray(parsed.excluded);

        const region = regionFieldsFor(parsed.destination);
        if (!region.regionCode) {
          console.warn(
            `[regions] 크롤 destination 미매핑 — 매트릭스 비노출: "${parsed.destination}" (post ${post.postKey})`
          );
        }

        // 본문 정제 — 빠른등록과 동일한 정책: cleanPostText → 차단어 줄 제거 → 캡션 줄 제거 → stripContacts.
        // 캡션으로 잡힌 줄은 이미지 위에 표시될 거라 본문에서 빼서 중복 노출 방지.
        const cleanText = cleanPostText(detail.content);
        const captionSet = new Set(
          detail.photos
            .slice(0, MAX_IMAGES_PER_POST)
            .map((p) => p.caption.trim())
            .filter(Boolean)
        );
        const rawTextForStore = (() => {
          const filteredByBlocklist = blocklistTerms.length
            ? cleanText
                .split("\n")
                .filter((line) => !blocklistTerms.some((term) => line.includes(term)))
                .join("\n")
            : cleanText;
          const filteredByCaption = captionSet.size
            ? filteredByBlocklist
                .split("\n")
                .filter((line) => !captionSet.has(line.trim()))
                .join("\n")
            : filteredByBlocklist;
          return stripContacts(
            filteredByCaption.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n")
          ).trim();
        })();

        const created = await prisma.product.create({
          data: {
            destination: parsed.destination,
            ...region,
            golfCourse: parsed.golfCourse,
            departureDate: new Date(`${parsed.departureDate}T00:00:00.000Z`),
            departureLabel: parsed.departureLabel,
            nights: parsed.nights,
            price: parsed.price,
            capacity: parsed.capacity,
            capacityLabel: parsed.capacityLabel,
            deadline: parsed.deadline
              ? new Date(`${parsed.deadline}T00:00:00.000Z`)
              : null,
            included: includedFinal,
            excluded: excludedFinal,
            sourceUrl,
            rawText: rawTextForStore,
            autoImported: true,
            bandPostId: post.postKey,
          },
        });

        const mediaRows: Array<{
          productId: string;
          type: "golf" | "accommodation" | "dining" | "youtube";
          url: string;
          caption: string | null;
          order: number;
        }> = [];

        const photoEntries = detail.photos.slice(0, MAX_IMAGES_PER_POST);
        for (let i = 0; i < photoEntries.length; i++) {
          const { url, caption } = photoEntries[i];
          const stored = await storeFromUrl(url);
          const cat = classifyImage(url, caption || null, detail.content);
          mediaRows.push({
            productId: created.id,
            type: cat,
            url: stored,
            caption: caption ? caption : null,
            order: i,
          });
        }

        const videoUrls = detail.youtubeUrls.slice(0, MAX_VIDEOS_PER_POST);
        for (let i = 0; i < videoUrls.length; i++) {
          mediaRows.push({
            productId: created.id,
            type: "youtube",
            url: videoUrls[i],
            caption: null,
            order: i,
          });
        }

        if (mediaRows.length > 0) {
          await prisma.productMedia.createMany({ data: mediaRows });
        }

        await markCrawled(sourceUrl, "done");
        imported++;
      } catch (err) {
        if (err instanceof BandApiAuthError) throw err; // 외곽 catch에서 처리
        failed++;
        const reason = err instanceof Error ? err.message : String(err);
        await markCrawled(sourceUrl, "failed").catch(() => {});
        errors.push({ postId: post.postKey, reason: reason.slice(0, 200) });
      }
    }

    await setConfigMany({
      [APP_CONFIG_KEYS.lastCrawlAt]: startedAt.toISOString(),
      [APP_CONFIG_KEYS.lastCrawlSuccess]: "true",
      [APP_CONFIG_KEYS.lastCrawlNew]: String(imported),
      [APP_CONFIG_KEYS.lastCrawlError]:
        errors.length > 0 ? JSON.stringify(errors).slice(0, 500) : "",
    } as Partial<Record<AppConfigKey, string>>);

    return {
      ok: true,
      totalListed: items.length,
      newCandidates: newPosts.length,
      imported,
      skipped,
      failed,
      errors,
    };
  } catch (err) {
    if (err instanceof BandApiAuthError) {
      await setConfigMany({
        [APP_CONFIG_KEYS.cookieExpiredAt]: startedAt.toISOString(),
        [APP_CONFIG_KEYS.lastCrawlAt]: startedAt.toISOString(),
        [APP_CONFIG_KEYS.lastCrawlSuccess]: "false",
        [APP_CONFIG_KEYS.lastCrawlError]: `밴드 인증 실패 (status=${err.statusCode}). 다시 연결하세요.`,
      } as Partial<Record<AppConfigKey, string>>);
      return { ok: false, reason: "auth_failed", statusCode: err.statusCode };
    }
    const msg = err instanceof Error ? err.message : String(err);
    await recordFailure(startedAt, msg);
    throw err;
  }
}

// API 호출 중 401/인증 오류가 떨어지면 refresh_token으로 1회 재시도 후 그대로 throw.
async function callWithRefresh<T>(
  fn: (token: string) => Promise<T>,
  state: TokenState
): Promise<T> {
  try {
    return await fn(state.accessToken);
  } catch (err) {
    if (!(err instanceof BandApiAuthError) || !state.refreshToken) throw err;
    const clientId = process.env.BAND_CLIENT_ID;
    const clientSecret = process.env.BAND_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw err;

    try {
      const fresh = await refreshAccessToken({
        clientId,
        clientSecret,
        refreshToken: state.refreshToken,
      });
      state.accessToken = fresh.access_token;
      if (fresh.refresh_token) state.refreshToken = fresh.refresh_token;
      const updates: Partial<Record<AppConfigKey, string>> = {
        [APP_CONFIG_KEYS.bandAccessToken]: fresh.access_token,
      };
      if (fresh.refresh_token) updates[APP_CONFIG_KEYS.bandRefreshToken] = fresh.refresh_token;
      if (typeof fresh.expires_in === "number") {
        updates[APP_CONFIG_KEYS.bandTokenExpiresAt] = new Date(
          Date.now() + fresh.expires_in * 1000
        ).toISOString();
      }
      await setConfigMany(updates);
    } catch (refreshErr) {
      if (refreshErr instanceof BandOAuthError) {
        throw new BandApiAuthError(refreshErr.statusCode, refreshErr.body);
      }
      throw refreshErr;
    }
    return fn(state.accessToken);
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
