// 메인 상단 랜딩 초특가 배너 + 상세 모달 (로그인 분기 포함)
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Operator = {
  name: string;
  phone: string;
  email: string;
};

type DetailImage = { id: string; url: string; caption: string | null };
type DetailVideo = { id: string; embedUrl: string; caption: string | null };

type Product = {
  id: string;
  destination: string;
  golfCourse: string | null;
  departureLabel: string | null;
  departureDateText: string;
  nights: number;
  price: number;
  capacity: number;
  capacityLabel: string | null;
  deadlineText: string | null;
  bodyText: string;
  included: string[];
  excluded: string[];
  images: DetailImage[];
  youtubeVideos: DetailVideo[];
  thumbnail: string | null;
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("ko-KR").format(price);
}

export default function LandingHeroDealClient({
  product,
  operators,
}: {
  product: Product;
  operators: Operator[];
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [showAuthChoice, setShowAuthChoice] = useState(false);

  // ESC로 닫기 + 본문 스크롤 잠금.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) setShowAuthChoice(false);
  }, [open]);

  function handleBook() {
    const target = `/booking/${product.id}`;
    if (status === "loading") return;
    if (session?.user?.id) {
      router.push(target);
      return;
    }
    // 비로그인 상태에서는 로그인/회원가입 선택지를 제공 (회원이면 로그인, 비회원이면 회원가입).
    setShowAuthChoice(true);
  }

  function goLogin() {
    const target = `/booking/${product.id}`;
    router.push(`/login?callbackUrl=${encodeURIComponent(target)}`);
  }

  function goRegister() {
    const target = `/booking/${product.id}`;
    router.push(`/register?callbackUrl=${encodeURIComponent(target)}`);
  }

  // 모달 상단 히어로로 쓰는 대표 이미지는 갤러리에서 제외해 중복 노출 방지.
  const galleryImages = product.images.filter((img) => img.url !== product.thumbnail);

  return (
    <>
      <section className="px-5 pt-2 pb-6 md:px-8 md:pt-4 md:pb-10">
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group block w-full overflow-hidden rounded-3xl border-2 border-brand-300 bg-gradient-to-r from-brand-500 to-warm-500 p-1 text-left shadow-xl transition-transform hover:scale-[1.01]"
          >
            <div className="flex flex-col gap-4 rounded-[1.25rem] bg-white p-5 md:flex-row md:items-center md:gap-6 md:p-6">
              {product.thumbnail && (
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl md:h-32 md:w-44 md:flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.thumbnail}
                    alt={product.destination}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-black text-brand-700 md:text-sm">
                  ⚡ 오늘의 초특가
                </span>
                <h2 className="mt-2 text-xl md:text-2xl font-black text-neutral-900 leading-snug">
                  {product.destination}
                </h2>
                {product.golfCourse && (
                  <p className="mt-1 text-sm md:text-base text-neutral-700 truncate">
                    {product.golfCourse}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-600 md:text-base">
                  <span>{product.departureDateText}</span>
                  <span>·</span>
                  <span>{product.nights}박</span>
                </div>
              </div>
              <div className="flex flex-row items-baseline justify-between gap-3 md:flex-col md:items-end md:gap-1">
                <div className="text-right">
                  <p className="text-xs md:text-sm text-neutral-500">1인</p>
                  <p className="text-2xl md:text-3xl font-black text-brand-600 whitespace-nowrap">
                    {formatPrice(product.price)}원
                  </p>
                </div>
                <span className="inline-flex h-11 items-center rounded-xl bg-neutral-900 px-5 text-sm font-black text-white md:h-12 md:px-6 md:text-base">
                  상세 보기 →
                </span>
              </div>
            </div>
          </button>
        </div>
      </section>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="초특가 상품 상세"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="닫기"
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-2xl text-neutral-700 shadow-lg hover:bg-neutral-100"
            >
              ×
            </button>

            {product.thumbnail && (
              <div className="relative aspect-[16/9] w-full overflow-hidden sm:rounded-t-3xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.thumbnail}
                  alt={product.destination}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="px-5 py-6 md:px-8 md:py-8">
              <span className="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-sm font-black text-brand-700">
                ⚡ 오늘의 초특가
              </span>
              <h2 className="mt-3 text-2xl md:text-3xl font-black text-neutral-900 leading-tight">
                {product.destination}
              </h2>
              {product.golfCourse && (
                <p className="mt-1 text-base md:text-lg text-neutral-700">
                  {product.golfCourse}
                </p>
              )}

              <dl className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-neutral-50 p-4 md:grid-cols-4">
                <Stat label="출발" value={product.departureDateText} />
                <Stat label="기간" value={`${product.nights}박`} />
                <Stat
                  label="정원"
                  value={product.capacityLabel ?? (product.capacity > 0 ? `${product.capacity}명` : "—")}
                />
                <Stat
                  label="1인 가격"
                  value={`${formatPrice(product.price)}원`}
                  highlight
                />
              </dl>

              {product.deadlineText && (
                <p className="mt-4 inline-block rounded-full bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700">
                  ⏰ 모집 마감 {product.deadlineText}
                </p>
              )}

              {product.bodyText && (
                <div className="mt-6">
                  <h3 className="text-lg font-black text-neutral-900">상세 안내</h3>
                  <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-neutral-800">
                    {product.bodyText}
                  </p>
                </div>
              )}

              {galleryImages.length > 0 && (
                <div className="mt-6 space-y-4">
                  {galleryImages.map((img) => (
                    <figure key={img.id}>
                      {img.caption && (
                        <figcaption className="mb-2 text-sm font-medium text-neutral-700">
                          {img.caption}
                        </figcaption>
                      )}
                      <div className="overflow-hidden rounded-2xl bg-neutral-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt={img.caption ?? product.destination}
                          className="w-full"
                        />
                      </div>
                    </figure>
                  ))}
                </div>
              )}

              {product.youtubeVideos.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-black text-neutral-900">소개 영상</h3>
                  <div className="mt-3 space-y-4">
                    {product.youtubeVideos.map((v) => (
                      <div
                        key={v.id}
                        className="aspect-video w-full overflow-hidden rounded-2xl bg-black"
                      >
                        <iframe
                          src={v.embedUrl}
                          title={v.caption ?? "소개 영상"}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="h-full w-full"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {product.included.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-base font-black text-neutral-900">포함 사항</h3>
                  <ul className="mt-2 space-y-1 text-base text-neutral-700">
                    {product.included.map((item, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-warm-600">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {product.excluded.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-base font-black text-neutral-900">불포함 사항</h3>
                  <ul className="mt-2 space-y-1 text-base text-neutral-700">
                    {product.excluded.map((item, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-neutral-400">×</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {operators.length > 0 && (
                <div className="mt-6 rounded-2xl border-2 border-warm-200 bg-warm-50 p-4 md:p-5">
                  <p className="text-base md:text-lg font-black text-warm-700">
                    문의는 아래로 해주세요
                  </p>
                  <ul className="mt-3 space-y-2">
                    {operators.map((op) => (
                      <li
                        key={`${op.name}-${op.phone}`}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base"
                      >
                        <span className="font-black text-neutral-900">{op.name}</span>
                        <a
                          href={`tel:${op.phone.replace(/[^0-9+]/g, "")}`}
                          className="font-bold text-warm-700 underline"
                        >
                          {op.phone}
                        </a>
                        {op.email && (
                          <a
                            href={`mailto:${op.email}`}
                            className="text-sm text-neutral-600 underline"
                          >
                            {op.email}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6">
                {!showAuthChoice ? (
                  <button
                    type="button"
                    onClick={handleBook}
                    disabled={status === "loading"}
                    className="block h-16 w-full rounded-2xl bg-brand-500 text-xl font-black text-white transition-colors hover:bg-brand-600 disabled:bg-neutral-300"
                  >
                    예약하기
                  </button>
                ) : (
                  <div>
                    <p className="text-center text-base font-bold text-neutral-800">
                      예약을 위해 로그인이 필요합니다
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={goLogin}
                        className="h-14 rounded-xl bg-neutral-900 text-base font-black text-white transition-colors hover:bg-neutral-800"
                      >
                        회원 로그인
                      </button>
                      <button
                        type="button"
                        onClick={goRegister}
                        className="h-14 rounded-xl bg-brand-500 text-base font-black text-white transition-colors hover:bg-brand-600"
                      >
                        회원가입 (비회원)
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAuthChoice(false)}
                      className="mt-3 block w-full text-center text-sm font-medium text-neutral-500 hover:underline"
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-bold text-neutral-500">{label}</dt>
      <dd
        className={[
          "mt-0.5 text-base md:text-lg font-black whitespace-nowrap",
          highlight ? "text-brand-600" : "text-neutral-900",
        ].join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}
