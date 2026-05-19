// 어드민 상품 삭제 버튼 (확인 후 DELETE 호출, 활성 예약 없을 때만 활성화)
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function DeleteProductButton({
  productId,
  destination,
}: {
  productId: string;
  destination: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (
      !window.confirm(
        `'${destination}' 상품을 삭제하시겠어요? 삭제 후에는 되돌릴 수 없어요.`
      )
    ) {
      return;
    }
    setError("");
    setLoading(true);
    const res = await fetch(`/api/admin/products/${productId}`, {
      method: "DELETE",
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "삭제에 실패했습니다.");
      return;
    }
    startTransition(() => router.refresh());
  }

  const busy = loading || pending;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        className="inline-flex h-9 items-center rounded-lg border border-red-300 px-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
      >
        {busy ? "삭제 중…" : "삭제"}
      </button>
      {error && <p className="max-w-[12rem] text-xs text-red-600">{error}</p>}
    </div>
  );
}
