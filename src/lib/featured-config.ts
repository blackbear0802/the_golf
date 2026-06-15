// 메인 노출(특가/랜딩) 지정 상품 id 조회 — 삭제 보호·표시 정합성 공용
import { APP_CONFIG_KEYS, getConfigMany } from "@/lib/app-config";

export function parseFeaturedIds(raw: string | null | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// 특가/랜딩으로 지정된 상품 id (삭제 차단용). all은 둘을 합친 집합.
export async function loadProtectedProductIds(): Promise<{
  featured: string[];
  landing: string | null;
  all: Set<string>;
}> {
  const cfg = await getConfigMany([
    APP_CONFIG_KEYS.featuredProductIds,
    APP_CONFIG_KEYS.landingProductId,
  ]);
  const featured = parseFeaturedIds(cfg.featuredProductIds);
  const landing = cfg.landingProductId?.trim() || null;
  const all = new Set<string>(featured);
  if (landing) all.add(landing);
  return { featured, landing, all };
}
