// 우측 고정 플로팅 추천 상품 위젯 (모바일은 하단 가로 스크롤) — 어드민 특가 지정 시 해당 3개 우선 노출.
import { prisma } from "@/lib/db";
import { APP_CONFIG_KEYS, getConfig } from "@/lib/app-config";

function formatPrice(price: number) {
  return new Intl.NumberFormat("ko-KR").format(price);
}

function formatDate(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export default async function FloatingDeals() {
  const featuredRaw = await getConfig(APP_CONFIG_KEYS.featuredProductIds);
  const featuredIds = (featuredRaw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let products;
  if (featuredIds.length > 0) {
    const found = await prisma.product.findMany({
      where: { id: { in: featuredIds } },
    });
    // 어드민이 지정한 순서를 유지.
    const byId = new Map(found.map((p) => [p.id, p]));
    products = featuredIds
      .map((id) => byId.get(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
  } else {
    products = await prisma.product.findMany({
      orderBy: { departureDate: "asc" },
      take: 5,
    });
  }

  return (
    <>
      <aside className="hidden lg:flex fixed right-5 top-28 z-30 w-72 h-[28rem] flex-col rounded-2xl border-2 border-warm-200 bg-white shadow-xl">
        <div className="rounded-t-2xl bg-warm-500 px-5 py-3 text-center">
          <p className="text-lg font-black text-white">{featuredIds.length > 0 ? "🔥 이번주 특가" : "🔥 지금 인기 투어"}</p>
        </div>
        <ul className="flex-1 overflow-y-auto p-3">
          {products.map((p) => (
            <li key={p.id}>
              <a
                href={`/products/${p.id}`}
                className="block rounded-xl p-3 transition-colors hover:bg-warm-50"
              >
                <span className="inline-flex items-center rounded-full bg-brand-500 px-2 py-0.5 text-xs font-black text-white shadow-sm">
                  ✓ 올포함
                </span>
                <p className="mt-1 text-base font-bold text-neutral-900 leading-snug">
                  {p.destination}
                </p>
                <p className="mt-0.5 text-sm text-neutral-600 truncate">
                  {p.golfCourse}
                </p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-sm text-neutral-500">
                    {p.departureLabel ?? formatDate(p.departureDate)} · {p.nights}박{p.nights + 1}일
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

      <aside className="lg:hidden border-b-2 border-warm-200 bg-white">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <p className="text-base font-black text-warm-600">{featuredIds.length > 0 ? "🔥 이번주 특가" : "🔥 지금 인기 투어"}</p>
        </div>
        <ul className="flex gap-3 overflow-x-auto px-4 pb-4 snap-x snap-mandatory">
          {products.map((p) => (
            <li key={p.id} className="snap-start shrink-0 w-56">
              <a
                href={`/products/${p.id}`}
                className="block rounded-xl border-2 border-warm-100 bg-warm-50 p-3"
              >
                <span className="inline-flex items-center rounded-full bg-brand-500 px-2 py-0.5 text-xs font-black text-white shadow-sm">
                  ✓ 올포함
                </span>
                <p className="mt-1 text-base font-bold text-neutral-900 truncate">
                  {p.destination}
                </p>
                <p className="mt-0.5 text-sm text-neutral-600 truncate">
                  {p.golfCourse}
                </p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xs text-neutral-500">
                    {p.departureLabel ?? formatDate(p.departureDate)} · {p.nights}박{p.nights + 1}일
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
