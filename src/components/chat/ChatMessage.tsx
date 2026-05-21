// AI 챗 메시지 풍선 + 추천 상품 카드 묶음 + 전체상품 링크 버튼 렌더러
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import type { RecommendedProduct, CatalogLink } from "@/lib/chat-tools";

export type Message =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string;
      recommendedProducts?: RecommendedProduct[];
      link?: CatalogLink | null;
    };

export default function ChatMessage({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-warm-500 px-4 py-3 text-white">
          <p className="whitespace-pre-wrap text-base leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  const products = message.recommendedProducts ?? [];
  const link = message.link;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-neutral-100 px-4 py-3 text-neutral-900">
          <p className="whitespace-pre-wrap text-base leading-relaxed">{message.content}</p>
        </div>
      </div>

      {products.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={{
                id: p.id,
                destination: p.destination,
                golfCourse: p.golfCourse,
                departureDate: new Date(p.departureDate),
                departureLabel: p.departureLabel,
                nights: p.nights,
                price: p.price,
                capacity: p.capacity,
                capacityLabel: p.capacityLabel,
                coverImage: p.coverImage,
              }}
            />
          ))}
        </div>
      )}

      {link && (
        <Link
          href={link.href}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-warm-500 px-5 py-3 text-base font-bold text-white transition-colors hover:bg-warm-600"
        >
          {link.label}
          <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  );
}
