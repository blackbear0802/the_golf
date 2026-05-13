// 어드민 상품 신규 등록 페이지
import Link from "next/link";
import ProductForm from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <div>
      <Link href="/admin/products" className="text-base text-warm-600 hover:underline">
        ← 상품 목록으로
      </Link>
      <h1 className="mt-3 text-2xl md:text-3xl font-black text-neutral-900">상품 신규 등록</h1>
      <p className="mt-1 text-base text-neutral-600">필수 항목(*)을 모두 채워주세요</p>

      <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6 md:p-8">
        <ProductForm mode="create" />
      </div>
    </div>
  );
}
