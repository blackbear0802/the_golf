// [임시] 쿠키 기반 밴드 페이지 fetch 클라이언트 — 8a34fdf 이전 검증 코드 복원, 테스트 전용
// 공식 Open API 키 발급 전까지만 사용. 운영 코드(src/lib/band-api-client.ts)는 건드리지 않음.

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
  constructor(public statusCode: number, public bodySnippet: string) {
    super(`Band auth failed (status=${statusCode})`);
    this.name = "BandAuthError";
  }
}

async function fetchBandPage(
  path: string,
  cookies: string
): Promise<{ status: number; html: string }> {
  const res = await fetch(`${BAND_BASE}${path}`, {
    method: "GET",
    headers: {
      ...DEFAULT_HEADERS,
      Cookie: cookies,
      Referer: `${BAND_BASE}/`,
    },
    redirect: "manual",
  });
  const html = await res.text();
  return { status: res.status, html };
}

function isAuthFailure(status: number, html: string): boolean {
  if (status === 401 || status === 403) return true;
  if (status >= 300 && status < 400) return true; // 로그인으로 리다이렉트
  if (html.includes("nid.naver.com/nidlogin.login")) return true;
  if (html.includes("로그인이 필요") || html.includes("Sign in to Band")) return true;
  return false;
}

export async function fetchPostList(
  bandId: string,
  cookies: string
): Promise<{ posts: BandPostMeta[]; rawHtml: string }> {
  const { status, html } = await fetchBandPage(`/band/${bandId}`, cookies);
  if (isAuthFailure(status, html)) {
    throw new BandAuthError(status, html.slice(0, 500));
  }

  const ids = new Set<string>();
  for (const m of html.matchAll(/\/band\/\d+\/post\/(\d+)/g)) ids.add(m[1]);
  for (const m of html.matchAll(/"post(?:No|Id)"\s*:\s*"?(\d{5,})/g)) ids.add(m[1]);
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
  const { status, html } = await fetchBandPage(path, cookies);
  if (isAuthFailure(status, html)) {
    throw new BandAuthError(status, html.slice(0, 500));
  }

  return {
    id: postId,
    url: `${BAND_BASE}${path}`,
    rawHtml: html,
    text: extractText(html),
    imageUrls: extractImageUrls(html),
    youtubeUrls: extractYoutubeUrls(html),
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
  const og =
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i.exec(html)
      ?.[1] ?? "";

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
  for (const m of html.matchAll(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi
  )) {
    urls.add(m[1]);
  }
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    const u = m[1];
    if (/^https?:\/\//.test(u)) urls.add(u);
  }
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
  for (const m of html.matchAll(/(?:https?:)?\/\/youtu\.be\/([A-Za-z0-9_-]{6,})/g)) {
    urls.add(`https://www.youtube.com/watch?v=${m[1]}`);
  }
  for (const m of html.matchAll(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/g)) {
    urls.add(`https://www.youtube.com/watch?v=${m[1]}`);
  }
  return Array.from(urls);
}
