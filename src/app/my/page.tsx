// 마이페이지 (회원 정보 + 내 예약 내역)
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const STATUS_LABEL = {
  pending: "접수 대기",
  contacted: "상담 진행 중",
  confirmed: "예약 확정",
  cancelled: "취소됨",
} as const;

const STATUS_STYLE = {
  pending: "bg-warm-100 text-warm-700",
  contacted: "bg-warm-200 text-warm-800",
  confirmed: "bg-warm-500 text-white",
  cancelled: "bg-neutral-200 text-neutral-600",
} as const;

function formatDate(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatDateTime(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${d} ${hh}:${mm}`;
}

export default async function MyPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/my");
  }

  const [user, bookings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, phone: true, createdAt: true },
    }),
    prisma.booking.findMany({
      where: { userId: session.user.id },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <>
      <Header />
      <main className="flex-1 px-5 py-10 md:px-8 md:py-14">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl md:text-4xl font-black text-neutral-900">
            <span className="text-warm-600">{user?.name ?? "회원"}</span> 고객님, 안녕하세요!
          </h1>
          <p className="mt-2 text-base md:text-lg text-neutral-600">
            예약 내역과 회원 정보를 한눈에 확인하실 수 있어요
          </p>

          <section className="mt-8 rounded-2xl border-2 border-warm-100 bg-white p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-black text-neutral-900">회원 정보</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <InfoCell label="이름" value={user?.name ?? "-"} />
              <InfoCell label="이메일" value={user?.email ?? "-"} />
              <InfoCell label="휴대전화" value={user?.phone ?? "-"} />
            </div>
            {user?.createdAt && (
              <p className="mt-4 text-sm text-neutral-500">
                가입일: {formatDateTime(user.createdAt)}
              </p>
            )}
          </section>

          <section className="mt-8">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl md:text-2xl font-black text-neutral-900">
                내 예약 내역
              </h2>
              <p className="text-base text-neutral-600">총 {bookings.length}건</p>
            </div>

            {bookings.length === 0 ? (
              <div className="mt-5 rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 p-10 text-center">
                <p className="text-lg text-neutral-600">아직 예약하신 상품이 없어요</p>
                <Link
                  href="/"
                  className="mt-4 inline-flex h-14 items-center rounded-xl bg-warm-500 px-6 text-lg font-bold text-white transition-colors hover:bg-warm-600"
                >
                  골프 투어 둘러보기
                </Link>
              </div>
            ) : (
              <ul className="mt-5 space-y-4">
                {bookings.map((booking) => (
                  <li
                    key={booking.id}
                    className="rounded-2xl border-2 border-warm-100 bg-white p-5 md:p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg md:text-xl font-black text-neutral-900">
                          {booking.product?.destination ?? "상품 정보 없음"}
                        </p>
                        {booking.product?.golfCourse && (
                          <p className="text-base text-neutral-700">
                            {booking.product.golfCourse}
                          </p>
                        )}
                      </div>
                      <span
                        className={[
                          "rounded-full px-3 py-1 text-sm font-bold",
                          STATUS_STYLE[booking.status],
                        ].join(" ")}
                      >
                        {STATUS_LABEL[booking.status]}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 text-base text-neutral-700 sm:grid-cols-2">
                      {booking.product && (
                        <>
                          <Row label="출발일" value={formatDate(booking.product.departureDate)} />
                          <Row label="기간" value={`${booking.product.nights}박`} />
                        </>
                      )}
                      <Row label="인원" value={`${booking.headcount}명`} />
                      <Row label="접수일" value={formatDateTime(booking.createdAt)} />
                    </div>

                    {booking.additionalRequest && (
                      <div className="mt-4 rounded-xl bg-neutral-50 p-3">
                        <p className="text-sm font-bold text-neutral-600">추가 요청사항</p>
                        <p className="mt-1 text-base text-neutral-800 whitespace-pre-wrap">
                          {booking.additionalRequest}
                        </p>
                      </div>
                    )}

                    <p className="mt-4 text-sm text-neutral-500 font-mono">
                      접수번호: {booking.id}
                    </p>

                    {booking.product && (
                      <Link
                        href={`/products/${booking.product.id}`}
                        className="mt-3 inline-flex h-12 items-center rounded-xl border-2 border-warm-300 px-4 text-base font-bold text-warm-700 transition-colors hover:bg-warm-50"
                      >
                        상품 다시 보기
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-warm-50 p-4">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-neutral-900 break-all">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 sm:flex-col sm:items-start sm:gap-1">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="font-bold text-neutral-900">{value}</span>
    </div>
  );
}
