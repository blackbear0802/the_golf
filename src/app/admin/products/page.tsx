// 어드민 상품 관리 (목록 + 자동/수동 필터 + 등록일시 컬럼 + 다중선택 일괄삭제)
import Link from "next/link";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import ProductsTable, { type ProductRow } from "@/components/admin/ProductsTable";
import { formatDateKST, formatDateTimeKST } from "@/lib/format-datetime";

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

  // 최근 등록(자동크롤·빠른등록 무관) 순으로 위에 노출.
  const [products, autoCount, manualCount, totalCount] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { media: true } },
        bookings: { select: { status: true } },
      },
    }),
    prisma.product.count({ where: { autoImported: true } }),
    prisma.product.count({ where: { autoImported: false } }),
    prisma.product.count(),
  ]);

  const rows: ProductRow[] = products.map((p) => {
    const totalBookings = p.bookings.length;
    const cancelledBookings = p.bookings.filter(
      (b) => b.status === "cancelled"
    ).length;
    return {
      id: p.id,
      destination: p.destination,
      golfCourse: p.golfCourse,
      departureLabel: p.departureLabel,
      departureDateText: formatDateKST(p.departureDate) ?? "-",
      nights: p.nights,
      price: p.price,
      capacity: p.capacity,
      capacityLabel: p.capacityLabel,
      autoImported: p.autoImported,
      mediaCount: p._count.media,
      totalBookings,
      cancelledBookings,
      activeBookings: totalBookings - cancelledBookings,
      createdAtText: formatDateTimeKST(p.createdAt) ?? "-",
    };
  });

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-neutral-900">상품 관리</h1>
          <p className="mt-1 text-base text-neutral-600">
            등록된 상품 목록 ({products.length}건 / 전체 {totalCount}건)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/products/quick"
            className="flex h-12 items-center rounded-xl bg-warm-500 px-5 text-base font-bold text-white transition-colors hover:bg-warm-600"
          >
            ⚡ 빠른 등록 (본문 붙여넣기)
          </Link>
          <Link
            href="/admin/products/new"
            className="flex h-12 items-center rounded-xl border-2 border-warm-300 px-5 text-base font-bold text-warm-700 transition-colors hover:bg-warm-50"
          >
            + 신규 등록
          </Link>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <FilterChip current={filter} value="all" label={`전체 ${totalCount}`} />
        <FilterChip current={filter} value="auto" label={`자동등록 ${autoCount}`} />
        <FilterChip current={filter} value="manual" label={`수동등록 ${manualCount}`} />
      </div>

      {rows.length === 0 ? (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
          <p className="p-10 text-center text-base text-neutral-500">
            조건에 맞는 상품이 없습니다.
          </p>
        </div>
      ) : (
        <ProductsTable rows={rows} />
      )}
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
