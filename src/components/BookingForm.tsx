// 예약 홀딩 폼 (자동 채움 readOnly + 인원/추가 요청 입력)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BookingForm({
  productId,
  capacity,
  user,
}: {
  productId: string;
  capacity: number;
  user: { name: string; email: string; phone: string };
}) {
  const router = useRouter();
  // 모집인원 미기재(0) 상품은 문의형이라 상한을 두지 않음(상담 시 확정)
  const maxHeadcount = capacity > 0 ? capacity : 99;
  const [headcount, setHeadcount] = useState(2);
  const [additionalRequest, setAdditionalRequest] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        headcount,
        additionalRequest,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "접수에 실패했습니다.");
      setLoading(false);
      return;
    }

    const { id } = await res.json();
    router.push(`/booking/complete?id=${id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      <div className="rounded-2xl border-2 border-neutral-200 bg-neutral-50 p-5">
        <p className="text-base font-bold text-neutral-800">예약자 정보 (회원정보 자동 입력)</p>
        <div className="mt-3 space-y-3">
          <ReadOnlyField label="이름" value={user.name || "-"} />
          <ReadOnlyField label="휴대전화" value={user.phone || "-"} />
          <ReadOnlyField label="이메일" value={user.email || "-"} />
        </div>
        <p className="mt-3 text-sm text-neutral-500">
          정보 수정은 마이페이지에서 가능합니다.
        </p>
      </div>

      <div>
        <label htmlFor="headcount" className="block text-base font-bold text-neutral-800">
          인원 {capacity > 0 ? `(최대 ${capacity}명)` : "(상담 시 확정)"}
        </label>
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setHeadcount((n) => Math.max(1, n - 1))}
            className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-neutral-200 bg-white text-2xl font-black text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            −
          </button>
          <input
            id="headcount"
            type="number"
            min={1}
            max={maxHeadcount}
            value={headcount}
            onChange={(e) => {
              const n = Math.min(maxHeadcount, Math.max(1, Number(e.target.value) || 1));
              setHeadcount(n);
            }}
            className="h-16 flex-1 rounded-xl border-2 border-neutral-200 bg-white px-4 text-center text-2xl font-black text-neutral-900 focus:border-warm-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setHeadcount((n) => Math.min(maxHeadcount, n + 1))}
            className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-neutral-200 bg-white text-2xl font-black text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            +
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="additionalRequest" className="block text-base font-bold text-neutral-800">
          추가 요청사항 (선택)
        </label>
        <textarea
          id="additionalRequest"
          rows={5}
          value={additionalRequest}
          onChange={(e) => setAdditionalRequest(e.target.value)}
          placeholder="예: 채식 식단 가능 여부, 동반자 정보, 특이사항 등"
          className="mt-2 block w-full rounded-xl border-2 border-neutral-200 bg-white px-4 py-3 text-lg text-neutral-900 placeholder:text-neutral-400 focus:border-warm-500 focus:outline-none"
        />
      </div>

      {error && (
        <p className="rounded-xl bg-brand-50 px-4 py-3 text-base font-medium text-brand-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="block h-16 w-full rounded-xl bg-warm-500 text-xl font-black text-white transition-colors hover:bg-warm-600 disabled:bg-neutral-300"
      >
        {loading ? "접수 중..." : "예약 신청하기"}
      </button>
      <p className="text-center text-sm text-neutral-500">
        신청하시면 24시간 이내에 전문 상담원이 전화드립니다
      </p>
    </form>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-neutral-900">{value}</p>
    </div>
  );
}
