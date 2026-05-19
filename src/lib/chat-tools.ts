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
  coverImage: string | null;
};

export const SEARCH_PRODUCTS_TOOL: Anthropic.Messages.Tool = {
  name: "search_products",
  description:
    "사용자 요구사항에 맞는 골프 투어 상품을 데이터베이스에서 검색합니다. " +
    "사용자가 목적지, 기간, 예산, 인원, 출발 시기 중 충분한 정보를 줬을 때 호출하세요. " +
    "정보가 부족하면 호출하지 말고 자연어로 추가 질문을 하세요.",
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

type SearchArgs = {
  destination?: string;
  nightsMin?: number;
  nightsMax?: number;
  priceMax?: number;
  capacityMin?: number;
  departureMonth?: string;
  limit?: number;
};

export async function executeSearchProducts(
  args: SearchArgs
): Promise<RecommendedProduct[]> {
  const limit = Math.min(Math.max(args.limit ?? 3, 1), 6);

  // 출발 시기 → 해당 달의 1일~말일 범위
  let dateGte: Date | undefined;
  let dateLt: Date | undefined;
  if (args.departureMonth && /^\d{4}-\d{2}$/.test(args.departureMonth)) {
    const [y, m] = args.departureMonth.split("-").map(Number);
    dateGte = new Date(Date.UTC(y, m - 1, 1));
    dateLt = new Date(Date.UTC(y, m, 1));
  }

  const rows = await prisma.product.findMany({
    where: {
      ...(args.destination
        ? { destination: { contains: args.destination, mode: "insensitive" } }
        : {}),
      ...(args.nightsMin || args.nightsMax
        ? {
            nights: {
              ...(args.nightsMin ? { gte: args.nightsMin } : {}),
              ...(args.nightsMax ? { lte: args.nightsMax } : {}),
            },
          }
        : {}),
      ...(args.priceMax ? { price: { lte: args.priceMax } } : {}),
      ...(args.capacityMin ? { capacity: { gte: args.capacityMin } } : {}),
      ...(dateGte && dateLt ? { departureDate: { gte: dateGte, lt: dateLt } } : {}),
    },
    orderBy: { departureDate: "asc" },
    take: limit,
    include: {
      media: {
        where: { type: "golf" },
        orderBy: { order: "asc" },
        take: 1,
      },
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
    coverImage: r.media[0]?.url ?? null,
  }));
}
