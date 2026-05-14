// 미디어 URL 보관 추상화 (MVP는 원본 URL 그대로 반환, 2단계에서 Vercel Blob 이관 시 교체)
// 호출부는 항상 이 함수가 반환한 URL을 ProductMedia.url에 저장해야 한다.

export async function storeFromUrl(url: string): Promise<string> {
  // 향후: Blob에 다운로드 → 우리 URL 반환. 지금은 그대로 passthrough.
  return url;
}

export async function storeManyFromUrls(urls: string[]): Promise<string[]> {
  return Promise.all(urls.map(storeFromUrl));
}
