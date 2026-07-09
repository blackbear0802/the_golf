// 어드민 회원 역할 변경 select (인라인 PATCH 호출)
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const OPTIONS = [
  { value: "user", label: "일반 회원" },
  { value: "admin", label: "관리자" },
] as const;

export default function MemberRoleSelect({
  userId,
  currentRole,
  disabled = false,
}: {
  userId: string;
  currentRole: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [role, setRole] = useState(currentRole);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function handleChange(next: string) {
    setError("");
    const prev = role;
    setRole(next);
    const res = await fetch(`/api/admin/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: next }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setRole(prev);
      setError(data.error ?? "변경 실패");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        value={role}
        disabled={pending || disabled}
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
