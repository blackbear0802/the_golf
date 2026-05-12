// 예약 홀딩 폼 페이지 (로그인 필수, 자동 채움 + 직접 입력)
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StepIndicator from "@/components/StepIndicator";
import BookingForm from "@/components/BookingForm";

function formatPrice(price: number) {
  return new Intl.NumberFormat("ko-KR").format(price);
}

function formatDate(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export default async function BookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/booking/${id}`);
  }

  const [product, user] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, phone: true },
    }),
  ]);
  if (!product) notFound();

  return (
    <>
      <Header />
      <main className="flex-1 pb-12">
        <StepIndicator current={2} />

        <section className="px-5 md:px-8">
          <div className="mx-auto max-w-3xl">
            <Link
              href={`/products/${product.id}`}
              className="inline-flex items-center text-base font-bold text-warm-600 hover:underline"
            >
              ← 상품으로 돌아가기
            </Link>

            <h1 className="mt-4 text-2xl md:text-3xl font-black text-neutral-900">
              예약 문의 작성
            </h1>
            <p className="mt-2 text-base text-neutral-600">
              아래 정보로 접수하면 24시간 내에 전문 상담원이 직접 연락드립니다
            </p>

            <div className="mt-6 rounded-2xl border-2 border-warm-100 bg-warm-50 p-5">
              <p className="text-base font-bold text-warm-700">예약 상품</p>
              <p className="mt-1 text-lg md:text-xl font-black text-neutral-900">
                {product.destination}
              </p>
              {product.golfCourse && (
                <p className="text-base text-neutral-700">{product.golfCourse}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-neutral-700">
                <span>출발일 {formatDate(product.departureDate)}</span>
                <span>·</span>
                <span>{product.nights}박</span>
                <span>·</span>
                <span className="font-bold text-warm-700">
                  1인 {formatPrice(product.price)}원
                </span>
              </div>
            </div>

            <BookingForm
              productId={product.id}
              capacity={product.capacity}
              user={{
                name: user?.name ?? "",
                email: user?.email ?? "",
                phone: user?.phone ?? "",
              }}
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
