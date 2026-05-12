// 회원가입 페이지 (이름/이메일/연락처/비밀번호 + 검증)
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  validateEmail,
  validatePhone,
  validatePassword,
} from "@/lib/validators";

type FieldErrors = {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  passwordConfirm?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    passwordConfirm: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function validateAll(): FieldErrors {
    const errors: FieldErrors = {};
    if (!form.name.trim()) errors.name = "이름을 입력해주세요.";
    errors.email = validateEmail(form.email) ?? undefined;
    errors.phone = validatePhone(form.phone) ?? undefined;
    errors.password = validatePassword(form.password) ?? undefined;
    if (!form.passwordConfirm) {
      errors.passwordConfirm = "비밀번호를 한 번 더 입력해주세요.";
    } else if (form.password !== form.passwordConfirm) {
      errors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
    }
    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");

    const errors = validateAll();
    const hasError = Object.values(errors).some(Boolean);
    if (hasError) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    const { passwordConfirm: _, ...payload } = form;
    void _;
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setSubmitError(data.error ?? "가입에 실패했습니다.");
      setLoading(false);
      return;
    }

    await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);
    router.push("/");
    router.refresh();
  }

  function fieldClass(hasError: boolean) {
    return [
      "mt-2 block h-16 w-full rounded-xl border-2 bg-white px-4 text-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none",
      hasError
        ? "border-brand-500 focus:border-brand-600"
        : "border-neutral-200 focus:border-warm-500",
    ].join(" ");
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-warm-50 px-5 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl md:p-10">
        <Link href="/" className="block text-center">
          <span className="text-3xl font-black text-warm-600">The Golf</span>
        </Link>

        <h1 className="mt-8 text-center text-2xl md:text-3xl font-black text-neutral-900">
          회원가입
        </h1>
        <p className="mt-3 text-center text-base text-neutral-600">
          몇 가지만 입력하시면 바로 시작하실 수 있어요
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
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
              <p className="mt-1.5 text-sm font-medium text-brand-600">
                {fieldErrors.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-base font-bold text-neutral-800">
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="example@email.com"
              className={fieldClass(!!fieldErrors.email)}
            />
            {fieldErrors.email && (
              <p className="mt-1.5 text-sm font-medium text-brand-600">
                {fieldErrors.email}
              </p>
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
              <p className="mt-1.5 text-sm font-medium text-brand-600">
                {fieldErrors.phone}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-base font-bold text-neutral-800">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="영문·숫자·특수문자 포함 8자 이상"
              className={fieldClass(!!fieldErrors.password)}
            />
            {fieldErrors.password ? (
              <p className="mt-1.5 text-sm font-medium text-brand-600">
                {fieldErrors.password}
              </p>
            ) : (
              <p className="mt-1.5 text-sm text-neutral-500">
                영문·숫자·특수문자를 모두 포함하여 8자 이상으로 입력해주세요.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="passwordConfirm" className="block text-base font-bold text-neutral-800">
              비밀번호 확인
            </label>
            <input
              id="passwordConfirm"
              type="password"
              value={form.passwordConfirm}
              onChange={(e) => update("passwordConfirm", e.target.value)}
              placeholder="비밀번호를 한 번 더 입력"
              className={fieldClass(!!fieldErrors.passwordConfirm)}
            />
            {fieldErrors.passwordConfirm && (
              <p className="mt-1.5 text-sm font-medium text-brand-600">
                {fieldErrors.passwordConfirm}
              </p>
            )}
          </div>

          {submitError && (
            <p className="rounded-xl bg-brand-50 px-4 py-3 text-base font-medium text-brand-700">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="block h-16 w-full rounded-xl bg-warm-500 text-xl font-black text-white transition-colors hover:bg-warm-600 disabled:bg-neutral-300"
          >
            {loading ? "가입 중..." : "가입하고 시작하기"}
          </button>
        </form>

        <p className="mt-7 text-center text-base text-neutral-600">
          이미 회원이신가요?{" "}
          <Link href="/login" className="font-bold text-warm-600 underline">
            로그인
          </Link>
        </p>
      </div>
    </main>
  );
}
