// sitemap.xml 생성기 — 정적 페이지 + DB의 모든 활성 상품 URL
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

// 빌드 타임 DB 의존 제거 — 요청 시 생성해 DB 장애가 배포 전체를 막지 않도록
export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXTAUTH_URL ??
  "https://thegolfer.co.kr";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/search`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/register`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const products = await prisma.product.findMany({
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
    productEntries = products.map((p) => ({
      url: `${SITE_URL}/products/${p.id}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch {
    // DB 일시 장애 시 정적 항목만이라도 반환 (sitemap 500 방지)
  }

  return [...staticEntries, ...productEntries];
}
