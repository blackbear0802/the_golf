// 상품 검색/목록 페이지 (Prisma 조건 조회, 필터 + 카드 그리드)
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchFilters from "@/components/SearchFilters";
import ProductCard from "@/components/ProductCard";

export const metadata: Metadata = {
  title: "골프 투어 상품 검색",
  description: "목적지·일정·예산별 골프 투어 패키지를 검색하세요. 시니어 맞춤 항공·숙박·라운딩이 모두 포함된 가격으로 비교 가능합니다.",
  alternates: { canonical: "/search" },
  openGraph: {
    title: "골프 투어 상품 검색",
    description: "목적지·일정·예산별 골프 투어 패키지를 검색하세요.",
    url: "/search",
  },
};

const PRICE_BUCKETS: Record<string, { gte?: number; lt?: number }> = {
  under150: { lt: 1_500_000 },
  "150to180": { gte: 1_500_000, lt: 1_800_000 },
  over180: { gte: 1_800_000 },
};

type SortMode = "departure" | "price-asc" | "price-desc";

function buildOrderBy(sort: SortMode) {
  switch (sort) {
    case "price-asc":
      return { price: "asc" as const };
    case "price-desc":
      return { price: "desc" as const };
    default:
      return { departureDate: "asc" as const };
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    destination?: string;
    nights?: string;
    price?: string;
    sort?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim();
  const destinationFilter = sp.destination?.trim();
  const nightsFilter = sp.nights ? Number(sp.nights) : undefined;
  const priceBucket = sp.price ? PRICE_BUCKETS[sp.price] : undefined;
  const sort = (sp.sort ?? "departure") as SortMode;

  const where: Record<string, unknown> = {};

  if (q) {
    where.OR = [
      { destination: { contains: q, mode: "insensitive" } },
      { golfCourse: { contains: q, mode: "insensitive" } },
    ];
  }
  if (destinationFilter) {
    where.destination = destinationFilter;
  }
  if (nightsFilter !== undefined) {
    if (nightsFilter >= 5) {
      where.nights = { gte: 5 };
    } else {
      where.nights = nightsFilter;
    }
  }
  if (priceBucket) {
    where.price = priceBucket;
  }

  const [products, allDestinations] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: buildOrderBy(sort),
      include: {
        media: {
          where: { type: "golf" },
          orderBy: { order: "asc" },
          take: 1,
        },
      },
    }),
    prisma.product.findMany({
      select: { destination: true },
      distinct: ["destination"],
      orderBy: { destination: "asc" },
    }),
  ]);

  return (
    <>
      <Header />
      <main className="flex-1 px-5 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl md:text-4xl font-black text-neutral-900">
            골프 투어 둘러보기
          </h1>
          <p className="mt-2 text-base md:text-lg text-neutral-600">
            원하시는 조건으로 골프 투어를 찾아보세요
          </p>

          <div className="mt-6">
            <SearchFilters
              destinations={allDestinations.map((d) => d.destination)}
            />
          </div>

          <div className="mt-6 flex items-baseline justify-between">
            <p className="text-lg font-bold text-neutral-800">
              총 <span className="text-warm-600">{products.length}</span>개 상품
            </p>
          </div>

          {products.length === 0 ? (
            <div className="mt-6 rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 p-12 text-center">
              <p className="text-xl font-bold text-neutral-700">
                조건에 맞는 상품이 없어요
              </p>
              <p className="mt-2 text-base text-neutral-500">
                필터를 변경하거나 초기화 후 다시 검색해보세요
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={{
                    id: product.id,
                    destination: product.destination,
                    golfCourse: product.golfCourse,
                    departureDate: product.departureDate,
                    departureLabel: product.departureLabel,
                    nights: product.nights,
                    price: product.price,
                    capacity: product.capacity,
                    capacityLabel: product.capacityLabel,
                    coverImage: product.media[0]?.url ?? null,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
