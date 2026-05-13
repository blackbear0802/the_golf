// 어드민 상품 수정 페이지 (초기값을 DB에서 로드해 ProductForm 재사용)
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import ProductForm from "@/components/admin/ProductForm";

function toDateInput(date: Date | null) {
  if (!date) return "";
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) notFound();

  return (
    <div>
      <Link href="/admin/products" className="text-base text-warm-600 hover:underline">
        ← 상품 목록으로
      </Link>
      <h1 className="mt-3 text-2xl md:text-3xl font-black text-neutral-900">상품 수정</h1>
      <p className="mt-1 text-base text-neutral-600 font-mono">{product.id}</p>

      <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6 md:p-8">
        <ProductForm
          mode="edit"
          productId={product.id}
          initial={{
            destination: product.destination,
            golfCourse: product.golfCourse ?? "",
            departureDate: toDateInput(product.departureDate),
            nights: product.nights,
            price: product.price,
            capacity: product.capacity,
            deadline: toDateInput(product.deadline),
            included: product.included.join("\n"),
            excluded: product.excluded.join("\n"),
            sourceUrl: product.sourceUrl ?? "",
            rawText: product.rawText ?? "",
          }}
        />
      </div>
    </div>
  );
}
