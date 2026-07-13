// 어드민 회원 소프트 삭제/복구 버튼 (DELETE 호출)
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function MemberDeleteButton({
  userId,
  deleted,
  disabled = false,
}: {
  userId: string;
  deleted: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function handleClick() {
    setError("");
    if (!deleted && !confirm("이 회원을 탈퇴 처리할까요? 로그인이 차단됩니다.")) {
      return;
    }
    const res = await fetch(`/api/admin/members/${userId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restore: deleted }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "처리 실패");
      return;
    }
    if (data.warning) alert(data.warning);
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending || disabled}
        className={[
          "h-10 rounded-lg px-3 text-sm font-bold transition-colors disabled:opacity-50",
          deleted
            ? "border border-warm-500 text-warm-600 hover:bg-warm-50"
            : "border border-brand-500 text-brand-600 hover:bg-brand-50",
        ].join(" ")}
      >
        {deleted ? "복구" : "탈퇴 처리"}
      </button>
      {error && <p className="text-xs text-brand-600">{error}</p>}
    </div>
  );
}
