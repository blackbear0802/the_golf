// 네이버 밴드 Open API 클라이언트 — access_token 기반 GET 호출.
// 호출자(band-crawler)는 401 시 refresh를 시도한 뒤 재호출하도록 한다.

const API_BASE = "https://openapi.band.us";

export class BandApiAuthError extends Error {
  constructor(public statusCode: number, public body: string) {
    super(`Band API auth failed (status=${statusCode})`);
    this.name = "BandApiAuthError";
  }
}

export class BandApiError extends Error {
  constructor(public resultCode: number, public body: string) {
    super(`Band API error (result_code=${resultCode}): ${body.slice(0, 200)}`);
    this.name = "BandApiError";
  }
}

export type BandSummary = {
  bandKey: string;
  name: string;
  memberCount?: number;
  cover?: string;
};

export type BandPostItem = {
  postKey: string;
  content: string;
  createdAt?: number;
  authorName?: string;
  photoUrls: string[];
};

export type BandPostFull = {
  postKey: string;
  bandKey: string;
  content: string;
  createdAt?: number;
  authorName?: string;
  photoUrls: string[];
  // 본문이나 첨부에서 추출한 유튜브 URL
  youtubeUrls: string[];
};

async function bandGet(path: string, params: Record<string, string>): Promise<unknown> {
  const q = new URLSearchParams(params);
  const res = await fetch(`${API_BASE}${path}?${q.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const text = await res.text();
  if (res.status === 401 || res.status === 403) {
    throw new BandApiAuthError(res.status, text);
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new BandApiError(-1, `non-JSON: ${text.slice(0, 200)}`);
  }
  const obj = json as { result_code?: number; result_data?: unknown };
  // 밴드 API는 인증 실패도 result_code로 표현하는 경우가 있음
  if (typeof obj.result_code === "number" && obj.result_code !== 1) {
    if (obj.result_code === 1003 || obj.result_code === 1006 || obj.result_code === 1024) {
      throw new BandApiAuthError(res.status, text);
    }
    throw new BandApiError(obj.result_code, text);
  }
  return obj.result_data;
}

export async function fetchBands(accessToken: string): Promise<BandSummary[]> {
  const data = (await bandGet("/v2.1/bands", { access_token: accessToken })) as
    | { bands?: unknown[] }
    | null;
  const rows = Array.isArray(data?.bands) ? data!.bands : [];
  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      bandKey: String(r.band_key ?? ""),
      name: String(r.name ?? ""),
      memberCount: typeof r.member_count === "number" ? r.member_count : undefined,
      cover: typeof r.cover === "string" ? r.cover : undefined,
    };
  });
}

export async function fetchPosts(
  accessToken: string,
  bandKey: string,
  locale = "ko-KR"
): Promise<{ items: BandPostItem[]; nextParams: Record<string, string> | null }> {
  const data = (await bandGet("/v2/band/posts", {
    access_token: accessToken,
    band_key: bandKey,
    locale,
  })) as { items?: unknown[]; paging?: { next_params?: Record<string, string> | null } } | null;

  const items = Array.isArray(data?.items) ? data!.items : [];
  const mapped: BandPostItem[] = items.map((row) => {
    const r = row as Record<string, unknown>;
    const photos = Array.isArray(r.photos)
      ? (r.photos as unknown[]).map((p) => {
          const pp = p as Record<string, unknown>;
          return typeof pp.url === "string" ? pp.url : "";
        }).filter(Boolean)
      : [];
    const author = (r.author as Record<string, unknown> | undefined)?.name;
    return {
      postKey: String(r.post_key ?? ""),
      content: typeof r.content === "string" ? r.content : "",
      createdAt: typeof r.created_at === "number" ? r.created_at : undefined,
      authorName: typeof author === "string" ? author : undefined,
      photoUrls: photos,
    };
  });

  const nextParams = data?.paging?.next_params ?? null;
  return { items: mapped, nextParams: nextParams ?? null };
}

export async function fetchPostDetail(
  accessToken: string,
  bandKey: string,
  postKey: string
): Promise<BandPostFull> {
  const data = (await bandGet("/v2.1/band/post", {
    access_token: accessToken,
    band_key: bandKey,
    post_key: postKey,
  })) as { post?: Record<string, unknown> } | null;

  const p = data?.post ?? {};
  const content = typeof p.content === "string" ? p.content : "";
  const author = (p.author as Record<string, unknown> | undefined)?.name;

  // BAND는 사진을 p.photo 객체 맵(키=photo_id)으로 반환한다(배열 아님).
  // 본문 안 <band:attachment type="photo" id="..." /> 순서대로 정렬해서
  // 게시글 작성자가 의도한 표시 순서를 보존한다.
  const photoMap: Record<string, string> = {};
  const photoObj = (p as { photo?: unknown }).photo;
  if (photoObj && typeof photoObj === "object") {
    for (const [id, o] of Object.entries(photoObj as Record<string, unknown>)) {
      const url = (o as { url?: unknown })?.url;
      if (typeof url === "string" && url) photoMap[id] = url;
    }
  }
  const orderedUrls: string[] = [];
  const seen = new Set<string>();
  for (const m of content.matchAll(
    /<band:attachment\s+type="photo"\s+id="(\d+)"\s*\/?>/gi
  )) {
    const url = photoMap[m[1]];
    if (url && !seen.has(url)) {
      orderedUrls.push(url);
      seen.add(url);
    }
  }
  // 본문에서 미참조된 사진은 뒤에 보존
  for (const url of Object.values(photoMap)) {
    if (!seen.has(url)) {
      orderedUrls.push(url);
      seen.add(url);
    }
  }

  return {
    postKey,
    bandKey,
    content,
    createdAt: typeof p.created_at === "number" ? p.created_at : undefined,
    authorName: typeof author === "string" ? author : undefined,
    photoUrls: orderedUrls,
    youtubeUrls: extractYoutubeUrls(content),
  };
}

function extractYoutubeUrls(text: string): string[] {
  const urls = new Set<string>();
  const patterns: RegExp[] = [
    /(?:https?:)?\/\/(?:www\.)?youtube\.com\/watch\?v=([A-Za-z0-9_-]{6,})/g,
    /(?:https?:)?\/\/youtu\.be\/([A-Za-z0-9_-]{6,})/g,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/g,
  ];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) urls.add(`https://www.youtube.com/watch?v=${m[1]}`);
  }
  return Array.from(urls);
}

export function postPermalink(bandKey: string, postKey: string): string {
  return `https://band.us/band/${bandKey}/post/${postKey}`;
}
