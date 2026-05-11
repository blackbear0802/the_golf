// 우측 고정 플로팅 추천 상품 위젯 (모바일은 하단 가로 스크롤)
import { prisma } from "@/lib/db";

function formatPrice(price: number) {
  return new Intl.NumberFormat("ko-KR").format(price);
}

function formatDate(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export default async function FloatingDeals() {
  const products = await prisma.product.findMany({
    orderBy: { departureDate: "asc" },
    take: 5,
  });

  return (
    <>
      <aside className="hidden lg:flex fixed right-5 top-28 z-30 w-72 flex-col rounded-2xl border-2 border-warm-200 bg-white shadow-xl">
        <div className="rounded-t-2xl bg-warm-500 px-5 py-3 text-center">
          <p className="text-lg font-black text-white">🔥 지금 인기 투어</p>
        </div>
        <ul className="max-h-[28rem] overflow-y-auto p-3">
          {products.map((p) => (
            <li key={p.id}>
              <a
                href={`/products/${p.id}`}
                className="block rounded-xl p-3 transition-colors hover:bg-warm-50"
              >
                <p className="text-base font-bold text-neutral-900 leading-snug">
                  {p.destination}
                </p>
                <p className="mt-0.5 text-sm text-neutral-600 truncate">
                  {p.golfCourse}
                </p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-sm text-neutral-500">
                    {formatDate(p.departureDate)} · {p.nights}박
                  </span>
                  <span className="text-lg font-black text-warm-600">
                    {formatPrice(p.price)}원
                  </span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </aside>

      <aside className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t-2 border-warm-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between px-4 py-2">
          <p className="text-base font-black text-warm-600">🔥 지금 인기 투어</p>
        </div>
        <ul className="flex gap-3 overflow-x-auto px-4 pb-4 snap-x snap-mandatory">
          {products.map((p) => (
            <li key={p.id} className="snap-start shrink-0 w-56">
              <a
                href={`/products/${p.id}`}
                className="block rounded-xl border-2 border-warm-100 bg-warm-50 p-3"
              >
                <p className="text-base font-bold text-neutral-900 truncate">
                  {p.destination}
                </p>
                <p className="mt-0.5 text-sm text-neutral-600 truncate">
                  {p.golfCourse}
                </p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xs text-neutral-500">
                    {formatDate(p.departureDate)} · {p.nights}박
                  </span>
                  <span className="text-base font-black text-warm-600">
                    {formatPrice(p.price)}원
                  </span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}
