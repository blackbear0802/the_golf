// 프로필(이름/연락처) 수정 폼 — PATCH /api/me 호출
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { validatePhone } from "@/lib/validators";

type FieldErrors = {
  name?: string;
  phone?: string;
};

export default function ProfileForm({
  initialName,
  initialPhone,
}: {
  initialName: string;
  initialPhone: string;
}) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [form, setForm] = useState({ name: initialName, phone: initialPhone });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    }
    if (success) setSuccess("");
  }

  function validateAll(): FieldErrors {
    const errors: FieldErrors = {};
    if (!form.name.trim()) errors.name = "이름을 입력해주세요.";
    errors.phone = validatePhone(form.phone) ?? undefined;
    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setSuccess("");

    const errors = validateAll();
    if (Object.values(errors).some(Boolean)) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSubmitError(data.error ?? "저장에 실패했습니다.");
      setLoading(false);
      return;
    }

    await updateSession({ name: form.name.trim() });
    setSuccess("회원 정보가 저장되었습니다.");
    setLoading(false);
    router.refresh();
  }

  return (
    <section className="rounded-2xl border-2 border-warm-100 bg-white p-6 md:p-8">
      <h2 className="text-xl md:text-2xl font-black text-neutral-900">회원 정보 수정</h2>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
        <div>
          <label htmlFor="name" className="block text-base font-bold text-neutral-800">
            이름
          </label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="홍길동"
            className={fieldClass(!!fieldErrors.name)}
          />
          {fieldErrors.name && (
            <p className="mt-1.5 text-sm font-medium text-brand-600">{fieldErrors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-base font-bold text-neutral-800">
            휴대전화 번호
          </label>
          <input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="010-1234-5678"
            className={fieldClass(!!fieldErrors.phone)}
          />
          {fieldErrors.phone && (
            <p className="mt-1.5 text-sm font-medium text-brand-600">{fieldErrors.phone}</p>
          )}
        </div>

        {submitError && (
          <p className="rounded-xl bg-brand-50 px-4 py-3 text-base font-medium text-brand-700">
            {submitError}
          </p>
        )}
        {success && (
          <p className="rounded-xl bg-warm-50 px-4 py-3 text-base font-bold text-warm-700">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="block h-14 w-full rounded-xl bg-warm-500 text-lg font-black text-white transition-colors hover:bg-warm-600 disabled:bg-neutral-300 md:w-auto md:px-8"
        >
          {loading ? "저장 중..." : "저장하기"}
        </button>
      </form>
    </section>
  );
}

function fieldClass(hasError: boolean) {
  return [
    "mt-2 block h-14 w-full rounded-xl border-2 bg-white px-4 text-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none",
    hasError
      ? "border-brand-500 focus:border-brand-600"
      : "border-neutral-200 focus:border-warm-500",
  ].join(" ");
}
