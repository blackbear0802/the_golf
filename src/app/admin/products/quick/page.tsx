// 어드민 빠른 상품 등록 페이지 (본문 붙여넣기 + 이미지 드롭)
import Link from "next/link";
import QuickProductForm from "@/components/admin/QuickProductForm";

export default function QuickProductPage() {
  return (
    <div>
      <Link href="/admin/products" className="text-base text-warm-600 hover:underline">
        ← 상품 목록으로
      </Link>
      <h1 className="mt-3 text-2xl md:text-3xl font-black text-neutral-900">
        빠른 상품 등록
      </h1>
      <p className="mt-1 text-base text-neutral-600">
        게시글 본문을 붙여넣고 이미지를 올리면 AI가 상품을 만들어 줍니다. 생성 후 수정
        화면에서 검수하세요.
      </p>

      <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6 md:p-8">
        <QuickProductForm />
      </div>
    </div>
  );
}
