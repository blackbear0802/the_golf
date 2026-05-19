// 상품 카드 (검색/목록 페이지에서 사용, 큰 이미지 + 큰 글씨)
import Link from "next/link";

function formatPrice(price: number) {
  return new Intl.NumberFormat("ko-KR").format(price);
}

function formatDate(date: Date) {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export type ProductCardData = {
  id: string;
  destination: string;
  golfCourse: string | null;
  departureDate: Date;
  departureLabel?: string | null;
  nights: number;
  price: number;
  capacity: number;
  coverImage?: string | null;
};

export default function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group block overflow-hidden rounded-2xl border-2 border-warm-100 bg-white transition-all hover:-translate-y-1 hover:border-warm-300 hover:shadow-xl"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-neutral-100">
        {product.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.coverImage}
            alt={product.destination}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-400">
            이미지 준비 중
          </div>
        )}
      </div>
      <div className="p-5">
        <p className="text-xl md:text-2xl font-black text-neutral-900 leading-snug">
          {product.destination}
        </p>
        {product.golfCourse && (
          <p className="mt-1 text-base text-neutral-600 truncate">
            {product.golfCourse}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-base text-neutral-700">
          <span>{product.departureLabel ?? formatDate(product.departureDate)} 출발</span>
          <span className="text-neutral-300">·</span>
          <span>{product.nights}박</span>
          <span className="text-neutral-300">·</span>
          <span>최대 {product.capacity}명</span>
        </div>
        <p className="mt-3 text-2xl font-black text-warm-600">
          {formatPrice(product.price)}원
          <span className="ml-1 text-sm font-medium text-neutral-500">/ 1인</span>
        </p>
      </div>
    </Link>
  );
}
