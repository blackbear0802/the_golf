// 어드민 예약 상태 변경 select (인라인 PATCH 호출)
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const OPTIONS = [
  { value: "pending", label: "접수 대기" },
  { value: "contacted", label: "상담 진행" },
  { value: "confirmed", label: "예약 확정" },
  { value: "cancelled", label: "취소" },
] as const;

export default function BookingStatusSelect({
  bookingId,
  currentStatus,
}: {
  bookingId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function handleChange(next: string) {
    setError("");
    const prev = status;
    setStatus(next);
    const res = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatus(prev);
      setError(data.error ?? "변경 실패");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        value={status}
        disabled={pending}
        onChange={(e) => handleChange(e.target.value)}
        className="h-10 rounded-lg border border-neutral-300 bg-white px-2.5 text-sm font-bold focus:border-warm-500 focus:outline-none disabled:opacity-50"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-brand-600">{error}</p>}
    </div>
  );
}
