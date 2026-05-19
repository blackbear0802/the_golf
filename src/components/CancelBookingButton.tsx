// 마이페이지 예약 취소 버튼 (확인 후 본인 취소 API 호출)
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function CancelBookingButton({
  bookingId,
}: {
  bookingId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCancel() {
    if (!window.confirm("정말 이 예약을 취소하시겠어요? 취소 후에는 되돌릴 수 없어요.")) {
      return;
    }
    setError("");
    setLoading(true);
    const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: "POST",
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "취소에 실패했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    startTransition(() => router.refresh());
  }

  const busy = loading || pending;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleCancel}
        disabled={busy}
        className="inline-flex h-12 items-center rounded-xl border-2 border-neutral-300 px-4 text-base font-bold text-neutral-600 transition-colors hover:border-brand-400 hover:text-brand-600 disabled:opacity-50"
      >
        {busy ? "취소 처리 중…" : "예약 취소"}
      </button>
      {error && <p className="text-sm text-brand-600">{error}</p>}
    </div>
  );
}
