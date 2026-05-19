// 상품 상세 페이지 (DB Product 단건 조회 + 미디어 갤러리 + 유튜브 영상)
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { stripContacts } from "@/lib/contact-replacer";
import { cleanPostText } from "@/lib/clean-post-text";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      destination: true,
      golfCourse: true,
      nights: true,
      price: true,
      departureDate: true,
      departureLabel: true,
    },
  });
  if (!product) {
    return { title: "상품을 찾을 수 없습니다", robots: { index: false } };
  }

  const priceText = new Intl.NumberFormat("ko-KR").format(product.price);
  const dep = product.departureDate;
  const dateText = product.departureLabel
    ? `${product.departureLabel} 출발`
    : `${dep.getFullYear()}.${String(dep.getMonth() + 1).padStart(2, "0")}.${String(
        dep.getDate()
      ).padStart(2, "0")} 출발`;
  const title = `${product.destination} ${product.nights}박 ${product.golfCourse}`;
  const description = `${dateText} · 1인 ${priceText}원. ${product.destination} 골프 투어 — 항공·숙박·라운딩 포함. 더 골프에서 안전하게 예약하세요.`;

  return {
    title,
    description,
    alternates: { canonical: `/products/${id}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/products/${id}`,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("ko-KR").format(price);
}

function formatDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}년 ${m}월 ${d}일`;
}

function getYoutubeEmbedUrl(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      className="h-6 w-6 shrink-0"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      className="h-6 w-6 shrink-0"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      media: {
        orderBy: [{ type: "asc" }, { order: "asc" }],
      },
    },
  });
  if (!product) notFound();

  const orderedImages = product.media
    .filter((m) => m.type !== "youtube")
    .slice()
    .sort((a, b) => a.order - b.order);
  const youtubeVideos = product.media.filter((m) => m.type === "youtube");
  const bodyText = product.rawText
    ? stripContacts(cleanPostText(product.rawText)).trim()
    : "";

  return (
    <>
      <Header />
      <main className="flex-1 pb-32">
        <section className="bg-gradient-to-b from-warm-50 to-background px-5 py-10 md:px-8 md:py-14">
          <div className="mx-auto max-w-4xl">
            <Link
              href="/"
              className="inline-flex items-center text-base font-bold text-warm-600 hover:underline"
            >
              ← 홈으로 돌아가기
            </Link>

            <h1 className="mt-6 text-3xl md:text-5xl font-black leading-tight text-neutral-900">
              {product.destination}
            </h1>
            {product.golfCourse && (
              <p className="mt-2 text-xl md:text-2xl font-bold text-neutral-700">
                {product.golfCourse}
              </p>
            )}

            <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <InfoCell
                label="출발일"
                value={product.departureLabel ?? formatDate(product.departureDate)}
              />
              <InfoCell label="기간" value={`${product.nights}박`} />
              <InfoCell
                label="모집 인원"
                value={
                  product.capacityLabel ??
                  (product.capacity > 0 ? `최대 ${product.capacity}명` : "인원 문의")
                }
              />
              <InfoCell
                label="가격 (1인)"
                value={`${formatPrice(product.price)}원`}
                highlight
              />
            </div>

            {product.deadline && (
              <p className="mt-5 inline-block rounded-full bg-brand-50 px-4 py-2 text-base font-bold text-brand-700">
                ⏰ 모집 마감 {formatDate(product.deadline)}
              </p>
            )}
          </div>
        </section>

        {bodyText && (
          <section className="px-5 py-10 md:px-8 md:py-14">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl md:text-3xl font-black text-neutral-900">
                상세 안내
              </h2>
              <p className="mt-6 whitespace-pre-wrap text-lg leading-relaxed text-neutral-800">
                {bodyText}
              </p>
            </div>
          </section>
        )}

        {orderedImages.length > 0 && (
          <section className="px-5 pb-4 md:px-8">
            <div className="mx-auto max-w-4xl space-y-5">
              {orderedImages.map((img) => (
                <figure key={img.id}>
                  <div className="overflow-hidden rounded-2xl bg-neutral-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.caption ?? product.destination}
                      className="w-full"
                    />
                  </div>
                  {img.caption && (
                    <figcaption className="mt-2 text-base text-neutral-600">
                      {img.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </section>
        )}

        {youtubeVideos.length > 0 && (
          <section className="px-5 py-10 md:px-8 md:py-14">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl md:text-3xl font-black text-neutral-900">
                소개 영상
              </h2>
              <div className="mt-6 space-y-6">
                {youtubeVideos.map((v) => {
                  const embed = getYoutubeEmbedUrl(v.url);
                  if (!embed) return null;
                  return (
                    <div key={v.id} className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
                      <iframe
                        src={embed}
                        title={v.caption ?? "소개 영상"}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="h-full w-full"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <section className="px-5 py-10 md:px-8 md:py-14">
          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
            <div className="rounded-2xl border-2 border-warm-100 bg-white p-7">
              <h2 className="text-xl md:text-2xl font-black text-neutral-900">
                포함 사항
              </h2>
              <ul className="mt-5 space-y-3">
                {product.included.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-lg text-neutral-800">
                    <span className="mt-0.5 text-warm-600">
                      <CheckIcon />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border-2 border-neutral-200 bg-neutral-50 p-7">
              <h2 className="text-xl md:text-2xl font-black text-neutral-900">
                불포함 사항
              </h2>
              <ul className="mt-5 space-y-3">
                {product.excluded.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-lg text-neutral-700">
                    <span className="mt-0.5 text-neutral-500">
                      <XIcon />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="px-5 pb-10 md:px-8 md:pb-14">
          <div className="mx-auto max-w-4xl rounded-2xl border-2 border-warm-200 bg-warm-50 p-7 text-center">
            <p className="text-lg md:text-xl font-bold text-warm-700">
              예약 문의 후 24시간 이내에 전문 상담원이 직접 전화드립니다
            </p>
            <p className="mt-2 text-base text-neutral-700">
              여권 정보나 결제 정보는 통화로 안전하게 안내해드려요
            </p>
          </div>
        </section>
      </main>
      <Footer />

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t-2 border-warm-200 bg-white shadow-2xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-3 md:px-8">
          <div className="hidden sm:block">
            <p className="text-sm text-neutral-500">1인 기준</p>
            <p className="text-2xl font-black text-warm-600">
              {formatPrice(product.price)}원
            </p>
          </div>
          <Link
            href={`/booking/${product.id}`}
            className="flex h-16 flex-1 items-center justify-center rounded-xl bg-warm-500 text-xl font-black text-white transition-colors hover:bg-warm-600 sm:flex-none sm:px-12"
          >
            예약 문의하기
          </Link>
        </div>
      </div>
    </>
  );
}

function InfoCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border-2 p-4",
        highlight
          ? "border-warm-300 bg-warm-50"
          : "border-neutral-200 bg-white",
      ].join(" ")}
    >
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      <p
        className={[
          "mt-1 text-lg md:text-xl font-black",
          highlight ? "text-warm-700" : "text-neutral-900",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}
