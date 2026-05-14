// 어드민 상품 관리 (목록 + 자동/수동 필터 + 자동등록 뱃지)
import Link from "next/link";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

function formatPrice(price: number) {
  return new Intl.NumberFormat("ko-KR").format(price);
}

function formatDate(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}.${m}.${d}`;
}

type Filter = "all" | "auto" | "manual";

function parseFilter(value: string | string[] | undefined): Filter {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "auto" || v === "manual" ? v : "all";
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const sp = await searchParams;
  const filter = parseFilter(sp.source);

  const where: Prisma.ProductWhereInput =
    filter === "auto"
      ? { autoImported: true }
      : filter === "manual"
        ? { autoImported: false }
        : {};

  const [products, autoCount, manualCount, totalCount] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { departureDate: "asc" },
      include: { _count: { select: { media: true, bookings: true } } },
    }),
    prisma.product.count({ where: { autoImported: true } }),
    prisma.product.count({ where: { autoImported: false } }),
    prisma.product.count(),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-neutral-900">상품 관리</h1>
          <p className="mt-1 text-base text-neutral-600">
            등록된 상품 목록 ({products.length}건 / 전체 {totalCount}건)
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="flex h-12 items-center rounded-xl bg-warm-500 px-5 text-base font-bold text-white transition-colors hover:bg-warm-600"
        >
          + 신규 등록
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <FilterChip current={filter} value="all" label={`전체 ${totalCount}`} />
        <FilterChip current={filter} value="auto" label={`자동등록 ${autoCount}`} />
        <FilterChip current={filter} value="manual" label={`수동등록 ${manualCount}`} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        {products.length === 0 ? (
          <p className="p-10 text-center text-base text-neutral-500">
            조건에 맞는 상품이 없습니다.
          </p>
        ) : (
          <table className="w-full text-sm md:text-base">
            <thead className="bg-neutral-50 text-sm text-neutral-500">
              <tr className="border-b border-neutral-200">
                <th className="px-4 py-3 text-left font-bold">목적지</th>
                <th className="px-4 py-3 text-left font-bold">골프장</th>
                <th className="px-4 py-3 text-left font-bold">출발</th>
                <th className="px-4 py-3 text-left font-bold">박수</th>
                <th className="px-4 py-3 text-left font-bold">가격</th>
                <th className="px-4 py-3 text-left font-bold">정원</th>
                <th className="px-4 py-3 text-left font-bold">출처</th>
                <th className="px-4 py-3 text-left font-bold">미디어</th>
                <th className="px-4 py-3 text-left font-bold">예약</th>
                <th className="px-4 py-3 text-right font-bold">관리</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-neutral-100">
                  <td className="px-4 py-3">
                    <Link
                      href={`/products/${p.id}`}
                      className="font-bold text-neutral-900 hover:text-warm-600"
                    >
                      {p.destination}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-700">{p.golfCourse ?? "-"}</td>
                  <td className="px-4 py-3 text-neutral-700 whitespace-nowrap">
                    {formatDate(p.departureDate)}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">{p.nights}박</td>
                  <td className="px-4 py-3 font-bold text-warm-600 whitespace-nowrap">
                    {formatPrice(p.price)}원
                  </td>
                  <td className="px-4 py-3 text-neutral-700">{p.capacity}명</td>
                  <td className="px-4 py-3">
                    {p.autoImported ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                        자동등록
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-600 ring-1 ring-neutral-200">
                        수동
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">{p._count.media}개</td>
                  <td className="px-4 py-3 text-neutral-700">{p._count.bookings}건</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/products/${p.id}/edit`}
                      className="inline-flex h-9 items-center rounded-lg border border-warm-300 px-3 text-sm font-bold text-warm-700 transition-colors hover:bg-warm-50"
                    >
                      수정
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  current,
  value,
  label,
}: {
  current: Filter;
  value: Filter;
  label: string;
}) {
  const isActive = current === value;
  const href = value === "all" ? "/admin/products" : `/admin/products?source=${value}`;
  return (
    <Link
      href={href}
      className={[
        "inline-flex h-9 items-center rounded-full px-4 text-sm font-bold transition-colors",
        isActive
          ? "bg-neutral-900 text-white"
          : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}
