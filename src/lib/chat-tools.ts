// AI 챗에서 사용하는 Anthropic tool 정의 + DB 실행 함수
// 도구: search_products — 자연어 필터를 받아 Product 후보를 반환.

import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";

export type RecommendedProduct = {
  id: string;
  destination: string;
  golfCourse: string | null;
  departureDate: string; // ISO
  departureLabel: string | null;
  nights: number;
  price: number;
  capacity: number;
  capacityLabel: string | null;
  coverImage: string | null;
};

export const SEARCH_PRODUCTS_TOOL: Anthropic.Messages.Tool = {
  name: "search_products",
  description:
    "골프 투어 상품을 추천합니다. 사용자가 목적지·기간·예산·인원·출발 시기 중 " +
    "한두 가지라도 줬으면 바로 호출하세요. 조건에 딱 맞는 상품이 없으면 자동으로 " +
    "비슷한 상품을 찾아 반환하므로(완화 검색), 추천을 망설이지 마세요. 결과의 " +
    "relaxed 필드가 비어있지 않으면 일부 조건을 완화해 찾은 '비슷한' 상품이라는 뜻입니다.",
  input_schema: {
    type: "object",
    properties: {
      destination: {
        type: "string",
        description:
          "목적지. 예: '베트남', '베트남 다낭', '태국', '일본 후쿠오카'. 부분 일치로 검색됩니다.",
      },
      nightsMin: { type: "number", description: "최소 박수 (예: 3)" },
      nightsMax: { type: "number", description: "최대 박수 (예: 5)" },
      priceMax: { type: "number", description: "1인 최대 예산(원 단위, 예: 1800000)" },
      capacityMin: {
        type: "number",
        description: "최소 모집 인원(동반 인원, 예: 4)",
      },
      departureMonth: {
        type: "string",
        description: "출발 시기. 'YYYY-MM' 형식 (예: '2026-11')",
      },
      limit: {
        type: "number",
        description: "추천할 상품 개수. 기본 3, 최대 6",
      },
    },
  },
};

export const BROWSE_CATALOG_TOOL: Anthropic.Messages.Tool = {
  name: "browse_catalog",
  description:
    "사용자가 '전체 상품', '전체 목록', '다 보여줘', '뭐 있는지 보고싶어'처럼 " +
    "특정 추천이 아니라 상품 전체를 둘러보고 싶어 할 때 호출하세요. 전체 상품 목록 " +
    "페이지로 가는 링크 버튼을 화면에 띄웁니다. 특정 목적지나 시기로 좁혀 보고 싶어 " +
    "하면 destination·month를 함께 넘기면 그 조건이 적용된 링크가 됩니다.",
  input_schema: {
    type: "object",
    properties: {
      destination: {
        type: "string",
        description: "선택. 목적지로 좁힌 목록을 보고 싶을 때. 예: '베트남 다낭'",
      },
      month: {
        type: "string",
        description: "선택. 출발 시기로 좁힐 때. 'YYYY-MM' 형식 (예: '2026-09')",
      },
    },
  },
};

type SearchArgs = {
  destination?: string;
  nightsMin?: number;
  nightsMax?: number;
  priceMax?: number;
  capacityMin?: number;
  departureMonth?: string;
  limit?: number;
};

type ProductWhere = NonNullable<
  Parameters<typeof prisma.product.findMany>[0]
>["where"];

function monthRange(month?: string): { gte: Date; lt: Date } | undefined {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return undefined;
  const [y, m] = month.split("-").map(Number);
  return { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) };
}

async function findByWhere(
  where: ProductWhere,
  limit: number
): Promise<RecommendedProduct[]> {
  const rows = await prisma.product.findMany({
    where,
    orderBy: { departureDate: "asc" },
    take: limit,
    include: {
      media: { where: { type: "golf" }, orderBy: { order: "asc" }, take: 1 },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    destination: r.destination,
    golfCourse: r.golfCourse,
    departureDate: r.departureDate.toISOString(),
    departureLabel: r.departureLabel,
    nights: r.nights,
    price: r.price,
    capacity: r.capacity,
    capacityLabel: r.capacityLabel,
    coverImage: r.media[0]?.url ?? null,
  }));
}

export type SearchResult = {
  products: RecommendedProduct[];
  // 완화된 조건 라벨 목록(비어있으면 모든 조건을 만족하는 정확 매칭)
  relaxed: string[];
};

/**
 * 엄격 AND 검색 후 0건이면 제약을 단계적으로 풀어 '비슷한' 상품이라도 반환.
 * 완화 순서: 인원 → 예산 → 박수 → 출발시기 → (목적지만) → 전체 최신.
 * 데이터가 적어도 빈손으로 끝나지 않게 해, 챗봇이 항상 대안을 제시할 수 있게 한다.
 */
export async function executeSearchProducts(
  args: SearchArgs
): Promise<SearchResult> {
  const limit = Math.min(Math.max(args.limit ?? 3, 1), 6);
  const range = monthRange(args.departureMonth);

  const cond = {
    destination: args.destination
      ? { destination: { contains: args.destination, mode: "insensitive" as const } }
      : undefined,
    nights:
      args.nightsMin || args.nightsMax
        ? {
            nights: {
              ...(args.nightsMin ? { gte: args.nightsMin } : {}),
              ...(args.nightsMax ? { lte: args.nightsMax } : {}),
            },
          }
        : undefined,
    price: args.priceMax ? { price: { lte: args.priceMax } } : undefined,
    capacity: args.capacityMin ? { capacity: { gte: args.capacityMin } } : undefined,
    month: range ? { departureDate: range } : undefined,
  };

  // 완화 단계: 뒤로 갈수록 조건을 더 많이 버린다(약한 제약부터 제거).
  const stages: Array<{ where: ProductWhere; dropped: string[] }> = [
    { where: { ...cond.destination, ...cond.nights, ...cond.price, ...cond.capacity, ...cond.month }, dropped: [] },
    { where: { ...cond.destination, ...cond.nights, ...cond.price, ...cond.month }, dropped: ["인원"] },
    { where: { ...cond.destination, ...cond.nights, ...cond.month }, dropped: ["인원", "예산"] },
    { where: { ...cond.destination, ...cond.month }, dropped: ["인원", "예산", "박수"] },
    { where: { ...cond.destination }, dropped: ["인원", "예산", "박수", "출발 시기"] },
    { where: {}, dropped: ["인원", "예산", "박수", "출발 시기", "목적지"] },
  ];

  for (const stage of stages) {
    const products = await findByWhere(stage.where, limit);
    if (products.length > 0) {
      // 실제로 사용자가 건 조건만 완화 라벨로 노출
      const askedFor = new Set<string>();
      if (args.capacityMin) askedFor.add("인원");
      if (args.priceMax) askedFor.add("예산");
      if (args.nightsMin || args.nightsMax) askedFor.add("박수");
      if (range) askedFor.add("출발 시기");
      if (args.destination) askedFor.add("목적지");
      const relaxed = stage.dropped.filter((d) => askedFor.has(d));
      return { products, relaxed };
    }
  }

  return { products: [], relaxed: [] };
}

export type CatalogLink = { href: string; label: string };

/** 전체상품/조건별 목록 페이지(/search) 딥링크와 버튼 라벨을 생성. */
export function buildCatalogLink(args: {
  destination?: string;
  month?: string;
}): CatalogLink {
  const sp = new URLSearchParams();
  if (args.destination?.trim()) sp.set("q", args.destination.trim());
  if (args.month && /^\d{4}-\d{2}$/.test(args.month)) sp.set("month", args.month);
  const qs = sp.toString();

  const parts: string[] = [];
  if (args.month && /^\d{4}-\d{2}$/.test(args.month)) {
    parts.push(`${Number(args.month.slice(5, 7))}월`);
  }
  if (args.destination?.trim()) parts.push(args.destination.trim());
  const label = parts.length > 0 ? `${parts.join(" ")} 상품 보기` : "전체 상품 보기";

  return { href: qs ? `/search?${qs}` : "/search", label };
}
