// 네이버 밴드 페이지 fetch 클라이언트 (Cookie 헤더 raw 전달, 인증 실패 감지)
// 실제 SPA/SSR 마크업이 외부에서 100% 보장 안 되므로, raw HTML과 추출 시도 결과를
// 함께 반환해 어드민이 BandCrawledData에 저장된 본문을 보고 보강할 수 있게 한다.

const BAND_BASE = "https://band.us";

const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
};

export type BandPostMeta = {
  id: string;
  url: string;
};

export type BandPostDetail = {
  id: string;
  url: string;
  rawHtml: string;
  text: string;
  imageUrls: string[];
  youtubeUrls: string[];
};

export class BandAuthError extends Error {
  constructor(
    public statusCode: number,
    public bodySnippet: string,
    public finalUrl: string = ""
  ) {
    super(`Band auth failed (status=${statusCode}, finalUrl=${finalUrl || "?"})`);
    this.name = "BandAuthError";
  }
}

// band.us는 인증된 요청에도 캐노니컬 URL로 redirect할 수 있어 자동 follow.
// 인증 실패는 (a) 최종 status 4xx (b) 최종 URL이 로그인 페이지 (c) 본문 마커로 판정.
export async function fetchBandPage(
  path: string,
  cookies: string
): Promise<{ status: number; html: string; finalUrl: string }> {
  const res = await fetch(`${BAND_BASE}${path}`, {
    method: "GET",
    headers: {
      ...DEFAULT_HEADERS,
      Cookie: cookies,
      Referer: `${BAND_BASE}/`,
    },
    redirect: "follow",
  });
  const html = await res.text();
  return { status: res.status, html, finalUrl: res.url };
}

function isAuthFailure(status: number, html: string, finalUrl: string): boolean {
  if (status === 401 || status === 403) return true;
  if (/nid\.naver\.com|auth\.band\.us|\/login|signin/i.test(finalUrl)) return true;
  if (html.includes("nid.naver.com/nidlogin.login")) return true;
  if (html.includes("로그인이 필요") || html.includes("Sign in to Band")) return true;
  return false;
}

export async function fetchPostList(
  bandId: string,
  cookies: string
): Promise<{ posts: BandPostMeta[]; rawHtml: string }> {
  const { status, html, finalUrl } = await fetchBandPage(`/band/${bandId}`, cookies);
  if (isAuthFailure(status, html, finalUrl)) {
    throw new BandAuthError(status, html.slice(0, 500), finalUrl);
  }

  const ids = new Set<string>();
  // URL 패턴
  for (const m of html.matchAll(/\/band\/\d+\/post\/(\d+)/g)) ids.add(m[1]);
  // inline JSON 필드명 패턴
  for (const m of html.matchAll(/"post(?:No|Id)"\s*:\s*"?(\d{5,})/g)) ids.add(m[1]);
  // data-post-no="..." 패턴
  for (const m of html.matchAll(/data-post-no="(\d+)"/g)) ids.add(m[1]);

  return {
    posts: Array.from(ids).map((id) => ({
      id,
      url: `${BAND_BASE}/band/${bandId}/post/${id}`,
    })),
    rawHtml: html,
  };
}

export async function fetchPostDetail(
  bandId: string,
  postId: string,
  cookies: string
): Promise<BandPostDetail> {
  const path = `/band/${bandId}/post/${postId}`;
  const { status, html, finalUrl } = await fetchBandPage(path, cookies);
  if (isAuthFailure(status, html, finalUrl)) {
    throw new BandAuthError(status, html.slice(0, 500), finalUrl);
  }

  const text = extractText(html);
  const imageUrls = extractImageUrls(html);
  const youtubeUrls = extractYoutubeUrls(html);

  return {
    id: postId,
    url: `${BAND_BASE}${path}`,
    rawHtml: html,
    text,
    imageUrls,
    youtubeUrls,
  };
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function extractText(html: string): string {
  // 1) og:description 메타 (1차 폴백)
  const og =
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i.exec(html)
      ?.[1] ?? "";

  // 2) inline JSON state에서 본문 필드 후보 찾기 ("body":"..." 또는 "content":"...")
  // 비공개 밴드 게시글 본문은 보통 escape된 JSON string으로 들어감
  const bodyMatches = [
    /"body"\s*:\s*"((?:[^"\\]|\\.)*)"/g,
    /"content"\s*:\s*"((?:[^"\\]|\\.)*)"/g,
    /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g,
  ];
  let candidate = "";
  for (const re of bodyMatches) {
    for (const m of html.matchAll(re)) {
      const decoded = m[1]
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "")
        .replace(/\\t/g, " ")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
      if (decoded.length > candidate.length) candidate = decoded;
    }
  }

  const combined = candidate.length > og.length ? candidate : og;
  return decodeHtmlEntities(combined).trim();
}

function extractImageUrls(html: string): string[] {
  const urls = new Set<string>();
  // og:image
  for (const m of html.matchAll(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi
  )) {
    urls.add(m[1]);
  }
  // 일반 img src
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    const u = m[1];
    if (/^https?:\/\//.test(u)) urls.add(u);
  }
  // inline JSON: "url" 또는 "imageUrl" 필드 중 band CDN/이미지 패턴
  for (const m of html.matchAll(
    /"(?:imageUrl|url|src)"\s*:\s*"(https?:\\?\/\\?\/[^"]+)"/g
  )) {
    const cleaned = m[1].replace(/\\\//g, "/");
    if (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(cleaned)) urls.add(cleaned);
  }
  return Array.from(urls).filter((u) => !u.includes("default_profile"));
}

function extractYoutubeUrls(html: string): string[] {
  const urls = new Set<string>();
  for (const m of html.matchAll(
    /(?:https?:)?\/\/(?:www\.)?youtube\.com\/watch\?v=([A-Za-z0-9_-]{6,})/g
  )) {
    urls.add(`https://www.youtube.com/watch?v=${m[1]}`);
  }
  for (const m of html.matchAll(
    /(?:https?:)?\/\/youtu\.be\/([A-Za-z0-9_-]{6,})/g
  )) {
    urls.add(`https://www.youtube.com/watch?v=${m[1]}`);
  }
  for (const m of html.matchAll(
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/g
  )) {
    urls.add(`https://www.youtube.com/watch?v=${m[1]}`);
  }
  return Array.from(urls);
}
