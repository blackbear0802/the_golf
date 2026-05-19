// 예약 접수 완료 페이지 (접수번호 + 24시간 내 연락 안내)
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "예약 접수 완료",
  robots: { index: false, follow: false },
};

import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StepIndicator from "@/components/StepIndicator";

function formatDate(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export default async function BookingCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  if (!id) notFound();

  const session = await getServerSession(authOptions);

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { product: true },
  });
  if (!booking) notFound();
  if (booking.userId !== session?.user?.id) notFound();

  return (
    <>
      <Header />
      <main className="flex-1 pb-12">
        <StepIndicator current={3} />

        <section className="px-5 py-8 md:px-8 md:py-12">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-warm-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="h-10 w-10 text-warm-600"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>

            <h1 className="mt-6 text-2xl md:text-4xl font-black text-neutral-900">
              예약 문의가 접수되었습니다
            </h1>
            <p className="mt-3 text-lg text-neutral-700">
              24시간 이내에 전문 상담원이 직접 전화드립니다
            </p>

            <div className="mt-8 rounded-2xl border-2 border-warm-200 bg-warm-50 p-6 text-left">
              <div className="space-y-3 text-base">
                <Row label="접수 번호" value={booking.id} mono />
                {booking.product && (
                  <>
                    <Row label="상품" value={booking.product.destination} />
                    {booking.product.golfCourse && (
                      <Row label="골프장" value={booking.product.golfCourse} />
                    )}
                    <Row
                      label="출발일"
                      value={booking.product.departureLabel ?? formatDate(booking.product.departureDate)}
                    />
                    <Row label="기간" value={`${booking.product.nights}박`} />
                  </>
                )}
                <Row label="인원" value={`${booking.headcount}명`} />
              </div>
            </div>

            <div className="mt-6 rounded-2xl border-2 border-neutral-200 bg-white p-6 text-left">
              <p className="text-base font-bold text-neutral-800">접수 후 절차</p>
              <ol className="mt-3 space-y-2 text-base text-neutral-700">
                <li className="flex gap-3">
                  <span className="font-black text-warm-600">1.</span>
                  <span>전문 상담원이 24시간 이내 전화드립니다</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-black text-warm-600">2.</span>
                  <span>여권 정보, 동반자 정보, 결제 방법을 전화로 안내드립니다</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-black text-warm-600">3.</span>
                  <span>예약 확정 후 일정과 준비물을 안내드립니다</span>
                </li>
              </ol>
            </div>

            <div className="mt-6 rounded-2xl bg-neutral-50 p-5 text-center">
              <p className="text-base text-neutral-600">연락이 늦어진다면</p>
              <p className="mt-1 text-2xl font-black text-warm-600">1588-0000</p>
              <p className="text-sm text-neutral-500">평일 09:00 ~ 18:00</p>
            </div>

            <Link
              href="/"
              className="mt-8 inline-flex h-16 items-center justify-center rounded-xl bg-warm-500 px-12 text-xl font-black text-white transition-colors hover:bg-warm-600"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-neutral-600">{label}</span>
      <span
        className={[
          "text-right font-bold text-neutral-900",
          mono ? "font-mono text-sm" : "",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}
