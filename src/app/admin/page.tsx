// 어드민 대시보드 (예약/사용자/상품 통계 카드 + 크롤링 상태 + 최근 예약 5건)
import Link from "next/link";
import { prisma } from "@/lib/db";
import { APP_CONFIG_KEYS, getConfigMany } from "@/lib/app-config";

const STATUS_LABEL = {
  pending: "접수 대기",
  contacted: "상담 진행",
  confirmed: "예약 확정",
  cancelled: "취소",
} as const;

function formatDateTime(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${date.getFullYear()}.${m}.${d} ${hh}:${mm}`;
}

function formatDateTime0(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return formatDateTime(d);
}

export default async function AdminDashboard() {
  const [
    totalBookings,
    pendingBookings,
    confirmedBookings,
    totalUsers,
    totalProducts,
    autoImportedCount,
    recentBookings,
    crawlCfg,
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "pending" } }),
    prisma.booking.count({ where: { status: "confirmed" } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.product.count(),
    prisma.product.count({ where: { autoImported: true } }),
    prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        product: { select: { destination: true } },
        user: { select: { name: true, phone: true } },
      },
    }),
    getConfigMany([
      APP_CONFIG_KEYS.crawlEnabled,
      APP_CONFIG_KEYS.cookieExpiredAt,
      APP_CONFIG_KEYS.lastCrawlAt,
      APP_CONFIG_KEYS.lastCrawlSuccess,
      APP_CONFIG_KEYS.lastCrawlNew,
      APP_CONFIG_KEYS.lastCrawlError,
    ]),
  ]);

  const cookieExpired = !!crawlCfg.cookieExpiredAt;
  const lastCrawlAt = formatDateTime0(crawlCfg.lastCrawlAt);
  const lastSuccess = crawlCfg.lastCrawlSuccess === "true";
  const crawlEnabled = crawlCfg.crawlEnabled === "true";

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-black text-neutral-900">대시보드</h1>
      <p className="mt-1 text-base text-neutral-600">
        예약·사용자·상품 현황을 한눈에 확인하세요
      </p>

      {cookieExpired && (
        <Link
          href="/admin/settings"
          className="mt-5 flex items-start gap-3 rounded-2xl border-2 border-brand-500 bg-brand-50 p-4 transition-opacity hover:opacity-90"
        >
          <span className="mt-0.5 text-xl">⚠️</span>
          <div>
            <p className="text-base font-black text-brand-700">밴드 인증이 만료되었습니다</p>
            <p className="mt-1 text-sm text-brand-700/80">
              자동 크롤링이 중단된 상태입니다. 설정 페이지에서 밴드를 다시 연결해주세요.
            </p>
          </div>
        </Link>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="총 예약" value={totalBookings} />
        <StatCard label="대기 중" value={pendingBookings} accent />
        <StatCard label="확정" value={confirmedBookings} />
        <StatCard label="회원 수" value={totalUsers} />
        <StatCard label="상품 수" value={totalProducts} />
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CrawlCard
          label="자동 크롤링"
          value={crawlEnabled ? "활성" : "비활성"}
          tone={crawlEnabled ? "ok" : "muted"}
          href="/admin/settings"
        />
        <CrawlCard
          label="마지막 실행"
          value={lastCrawlAt ?? "아직 없음"}
          sub={
            lastCrawlAt
              ? lastSuccess
                ? `성공 · 새 글 ${crawlCfg.lastCrawlNew ?? 0}건`
                : `실패 · ${crawlCfg.lastCrawlError ?? "원인 미상"}`
              : undefined
          }
          tone={lastCrawlAt ? (lastSuccess ? "ok" : "warn") : "muted"}
          href="/admin/settings"
        />
        <CrawlCard
          label="자동 등록 상품"
          value={`${autoImportedCount}건`}
          sub={
            autoImportedCount > 0 ? "최근 등록 상품 보기 →" : "아직 자동 등록된 상품이 없습니다"
          }
          tone={autoImportedCount > 0 ? "ok" : "muted"}
          href="/admin/products?source=auto"
        />
      </section>

      <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-black text-neutral-900">최근 예약</h2>
          <Link
            href="/admin/bookings"
            className="text-sm font-bold text-warm-600 hover:underline"
          >
            전체 보기 →
          </Link>
        </div>

        {recentBookings.length === 0 ? (
          <p className="mt-4 text-base text-neutral-500">예약 내역이 없습니다.</p>
        ) : (
          <table className="mt-4 w-full text-base">
            <thead className="text-sm text-neutral-500">
              <tr className="border-b border-neutral-200">
                <th className="py-3 text-left font-bold">고객</th>
                <th className="py-3 text-left font-bold">상품</th>
                <th className="py-3 text-left font-bold">인원</th>
                <th className="py-3 text-left font-bold">상태</th>
                <th className="py-3 text-left font-bold">접수일</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((b) => (
                <tr key={b.id} className="border-b border-neutral-100">
                  <td className="py-3">
                    <div className="font-bold text-neutral-900">
                      {b.user.name ?? "-"}
                    </div>
                    <div className="text-sm text-neutral-500">
                      {b.user.phone ?? "-"}
                    </div>
                  </td>
                  <td className="py-3 text-neutral-800">
                    {b.product?.destination ?? "-"}
                  </td>
                  <td className="py-3 text-neutral-800">{b.headcount}명</td>
                  <td className="py-3">
                    <span className="rounded-full bg-warm-100 px-2.5 py-1 text-sm font-bold text-warm-700">
                      {STATUS_LABEL[b.status]}
                    </span>
                  </td>
                  <td className="py-3 text-sm text-neutral-600">
                    {formatDateTime(b.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function CrawlCard({
  label,
  value,
  sub,
  tone,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "ok" | "warn" | "muted";
  href: string;
}) {
  const toneClass =
    tone === "ok"
      ? "border-warm-300 bg-white"
      : tone === "warn"
        ? "border-brand-500 bg-brand-50"
        : "border-neutral-200 bg-white";
  const valueColor =
    tone === "ok"
      ? "text-warm-600"
      : tone === "warn"
        ? "text-brand-600"
        : "text-neutral-900";

  return (
    <Link
      href={href}
      className={`block rounded-2xl border-2 p-5 transition-colors hover:bg-neutral-50 ${toneClass}`}
    >
      <p className="text-sm font-bold text-neutral-500">{label}</p>
      <p className={`mt-2 text-xl md:text-2xl font-black ${valueColor}`}>{value}</p>
      {sub && <p className="mt-2 text-sm text-neutral-600">{sub}</p>}
    </Link>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border bg-white p-5",
        accent ? "border-warm-300" : "border-neutral-200",
      ].join(" ")}
    >
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      <p
        className={[
          "mt-2 text-3xl font-black",
          accent ? "text-warm-600" : "text-neutral-900",
        ].join(" ")}
      >
        {value.toLocaleString("ko-KR")}
      </p>
    </div>
  );
}
