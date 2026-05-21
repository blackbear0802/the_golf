// 전체상품 매트릭스 페이지 — 월×지역 교차표(서버 컴포넌트 + ISR)
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MatrixGrid, { type MatrixRow } from "@/components/MatrixGrid";
import { parseDestination, compareRegions, type RegionInfo } from "@/lib/regions";

// 기준연도 1개로 시작(전 데이터 2026). 연도 토글은 후순위 — context-notes 참조
const BASE_YEAR = 2026;

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "전체 골프 투어 — 월별·지역별 한눈에",
  description:
    "월(가로)과 지역(세로) 교차표로 해외 골프 투어 출발 상품을 한눈에 비교하세요. 셀을 누르면 해당 월·지역 상품 목록으로 이동합니다.",
  alternates: { canonical: "/packages" },
};

export default async function PackagesMatrixPage() {
  const products = await prisma.product.findMany({
    where: {
      regionCode: { not: null },
      departureDate: {
        gte: new Date(Date.UTC(BASE_YEAR, 0, 1)),
        lt: new Date(Date.UTC(BASE_YEAR + 1, 0, 1)),
      },
    },
    select: { regionCode: true, departureDate: true, destination: true },
  });

  // counts[regionCode][month] — /search의 WHERE와 동일 조건으로 집계(건수 일치 강제)
  // 행 메타는 정적 사전 대신 상품 destination을 자동 파싱해 동적 구성
  const counts: Record<string, Record<number, number>> = {};
  const metaByRegion: Record<string, RegionInfo> = {};
  for (const p of products) {
    if (!p.regionCode) continue;
    const info = parseDestination(p.destination);
    if (!info) continue;
    const month = p.departureDate.getUTCMonth() + 1;
    (counts[p.regionCode] ??= {})[month] =
      (counts[p.regionCode]?.[month] ?? 0) + 1;
    metaByRegion[p.regionCode] = info;
  }

  // 해당 연도에 상품이 1건이라도 있는 지역만, 국가 order→지역명 가나다 순
  const rows: MatrixRow[] = Object.values(metaByRegion)
    .sort(compareRegions)
    .map((info) => ({
      regionCode: info.regionCode,
      countryCode: info.countryCode,
      countryName: info.countryName,
      regionName: info.regionName,
    }));

  const totalProducts = products.length;

  return (
    <>
      <Header />
      <main className="flex-1 px-5 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl md:text-4xl font-black text-neutral-900">
            전체 골프 투어 한눈에 보기
          </h1>
          <p className="mt-2 text-base md:text-lg text-neutral-600">
            {BASE_YEAR}년 출발 기준 · 월과 지역이 만나는 칸의 숫자가 출발 상품 수예요.
            숫자를 누르면 해당 목록으로 이동합니다.
          </p>

          {rows.length === 0 ? (
            <div className="mt-6 rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 p-12 text-center">
              <p className="text-xl font-bold text-neutral-700">
                {BASE_YEAR}년 출발 상품이 아직 없어요
              </p>
              <p className="mt-2 text-base text-neutral-500">
                상품이 등록되면 이 표에 자동으로 채워집니다
              </p>
            </div>
          ) : (
            <>
              <div className="mt-6">
                <MatrixGrid year={BASE_YEAR} rows={rows} counts={counts} />
              </div>
              <p className="mt-4 text-sm text-neutral-500">
                지역 {rows.length}곳 · 총 {totalProducts}개 상품 · 빈 칸(·)은 해당 월
                출발이 없는 경우입니다.
              </p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
