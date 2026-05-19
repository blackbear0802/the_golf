// 원격 이미지 URL을 Vercel Blob에 복사 후 우리 공개 URL 반환 (실패 시 원본 URL 폴백)
// 호출부는 항상 이 함수가 반환한 URL을 ProductMedia.url에 저장해야 한다.

import { put } from "@vercel/blob";

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

function pickExt(url: string, contentType: string): string {
  const m = /\.(jpe?g|png|webp|gif)(?:\?|#|$)/i.exec(url);
  if (m) return `.${m[1].toLowerCase().replace("jpeg", "jpg")}`;
  return EXT_BY_TYPE[contentType.split(";")[0].trim()] ?? "";
}

export async function storeFromUrl(url: string): Promise<string> {
  // 토큰 없으면 즉시 원본 URL 폴백 (크롤/빌드 막지 않음)
  if (!process.env.BLOB_READ_WRITE_TOKEN) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) return url;
    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    const data = await res.arrayBuffer();
    const key = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${pickExt(
      url,
      contentType
    )}`;
    const blob = await put(key, data, {
      access: "public",
      contentType,
      addRandomSuffix: false,
    });
    return blob.url;
  } catch {
    // fetch/업로드 등 어떤 실패든 원본 URL 폴백 (이미지 한 장이 크롤 전체를 막지 않도록)
    return url;
  }
}

export async function storeManyFromUrls(urls: string[]): Promise<string[]> {
  return Promise.all(urls.map(storeFromUrl));
}
