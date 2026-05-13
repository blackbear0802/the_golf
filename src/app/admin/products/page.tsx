// 어드민 상품 관리 (목록 - 등록/수정 폼은 다음 단계)
import Link from "next/link";
import { prisma } from "@/lib/db";

function formatPrice(price: number) {
  return new Intl.NumberFormat("ko-KR").format(price);
}

function formatDate(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}.${m}.${d}`;
}

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { departureDate: "asc" },
    include: { _count: { select: { media: true, bookings: true } } },
  });

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-neutral-900">상품 관리</h1>
          <p className="mt-1 text-base text-neutral-600">
            등록된 상품 목록 ({products.length}건)
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="flex h-12 items-center rounded-xl bg-warm-500 px-5 text-base font-bold text-white transition-colors hover:bg-warm-600"
        >
          + 신규 등록
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        {products.length === 0 ? (
          <p className="p-10 text-center text-base text-neutral-500">
            등록된 상품이 없습니다.
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
