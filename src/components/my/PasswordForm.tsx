// 비밀번호 변경 폼 — PATCH /api/me/password 호출
"use client";

import { useState } from "react";
import { validatePassword } from "@/lib/validators";

type FieldErrors = {
  currentPassword?: string;
  newPassword?: string;
  newPasswordConfirm?: string;
};

export default function PasswordForm() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    newPasswordConfirm: "",
  });
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
    if (!form.currentPassword) {
      errors.currentPassword = "현재 비밀번호를 입력해주세요.";
    }
    errors.newPassword = validatePassword(form.newPassword) ?? undefined;
    if (!form.newPasswordConfirm) {
      errors.newPasswordConfirm = "새 비밀번호를 한 번 더 입력해주세요.";
    } else if (form.newPassword !== form.newPasswordConfirm) {
      errors.newPasswordConfirm = "비밀번호가 일치하지 않습니다.";
    }
    if (
      form.currentPassword &&
      form.newPassword &&
      form.currentPassword === form.newPassword
    ) {
      errors.newPassword = "새 비밀번호는 현재 비밀번호와 달라야 합니다.";
    }
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
    const res = await fetch("/api/me/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSubmitError(data.error ?? "비밀번호 변경에 실패했습니다.");
      setLoading(false);
      return;
    }

    setSuccess("비밀번호가 변경되었습니다.");
    setForm({ currentPassword: "", newPassword: "", newPasswordConfirm: "" });
    setLoading(false);
  }

  return (
    <section className="rounded-2xl border-2 border-warm-100 bg-white p-6 md:p-8">
      <h2 className="text-xl md:text-2xl font-black text-neutral-900">비밀번호 변경</h2>
      <p className="mt-2 text-sm text-neutral-600">
        영문·숫자·특수문자를 모두 포함한 8자 이상으로 설정해주세요.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
        <div>
          <label htmlFor="currentPassword" className="block text-base font-bold text-neutral-800">
            현재 비밀번호
          </label>
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(e) => update("currentPassword", e.target.value)}
            className={fieldClass(!!fieldErrors.currentPassword)}
          />
          {fieldErrors.currentPassword && (
            <p className="mt-1.5 text-sm font-medium text-brand-600">
              {fieldErrors.currentPassword}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="newPassword" className="block text-base font-bold text-neutral-800">
            새 비밀번호
          </label>
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(e) => update("newPassword", e.target.value)}
            placeholder="영문·숫자·특수문자 포함 8자 이상"
            className={fieldClass(!!fieldErrors.newPassword)}
          />
          {fieldErrors.newPassword && (
            <p className="mt-1.5 text-sm font-medium text-brand-600">
              {fieldErrors.newPassword}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="newPasswordConfirm" className="block text-base font-bold text-neutral-800">
            새 비밀번호 확인
          </label>
          <input
            id="newPasswordConfirm"
            type="password"
            autoComplete="new-password"
            value={form.newPasswordConfirm}
            onChange={(e) => update("newPasswordConfirm", e.target.value)}
            placeholder="새 비밀번호를 한 번 더 입력"
            className={fieldClass(!!fieldErrors.newPasswordConfirm)}
          />
          {fieldErrors.newPasswordConfirm && (
            <p className="mt-1.5 text-sm font-medium text-brand-600">
              {fieldErrors.newPasswordConfirm}
            </p>
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
          {loading ? "변경 중..." : "비밀번호 변경"}
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
