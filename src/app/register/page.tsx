// 회원가입 페이지 (이름/이메일/연락처/비밀번호 + 검증)
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  validateEmail,
  validatePhone,
  validatePassword,
  validateBirthDate,
} from "@/lib/validators";
import {
  GENDER_OPTIONS,
  GOLF_CAREER_OPTIONS,
  HANDICAP_OPTIONS,
  REGION_OPTIONS,
} from "@/lib/signup-options";

// open redirect 방지: 상대 경로(/ 시작 + // 시작 아님)만 허용
function sanitizeCallback(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  return raw;
}

type FieldErrors = {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  passwordConfirm?: string;
  birthDate?: string;
  terms?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeCallback(searchParams.get("callbackUrl"));
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    passwordConfirm: "",
    birthDate: "",
    gender: "",
    golfCareer: "",
    handicap: "",
    region: "",
  });
  const [agree, setAgree] = useState({
    terms: false,
    privacy: false,
    marketing: false,
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  const agreeAll = agree.terms && agree.privacy && agree.marketing;

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key in fieldErrors && fieldErrors[key as keyof FieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function toggleAgree(key: keyof typeof agree, value: boolean) {
    setAgree((prev) => ({ ...prev, [key]: value }));
    if ((key === "terms" || key === "privacy") && fieldErrors.terms) {
      setFieldErrors((prev) => ({ ...prev, terms: undefined }));
    }
  }

  function toggleAgreeAll(value: boolean) {
    setAgree({ terms: value, privacy: value, marketing: value });
    if (fieldErrors.terms) {
      setFieldErrors((prev) => ({ ...prev, terms: undefined }));
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
    errors.birthDate = validateBirthDate(form.birthDate) ?? undefined;
    if (!agree.terms || !agree.privacy) {
      errors.terms = "필수 약관에 동의해주세요.";
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

    const { passwordConfirm: _, ...formFields } = form;
    void _;
    const payload = {
      ...formFields,
      agreeTerms: agree.terms,
      agreePrivacy: agree.privacy,
      agreeMarketing: agree.marketing,
    };
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
    router.push(callbackUrl);
    router.refresh();
  }

  const loginHref = callbackUrl === "/"
    ? "/login"
    : `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  function fieldClass(hasError: boolean) {
    return [
      "mt-2 block h-16 w-full rounded-xl border-2 bg-white px-4 text-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none",
      hasError
        ? "border-brand-500 focus:border-brand-600"
        : "border-neutral-200 focus:border-warm-500",
    ].join(" ");
  }

  const selectClass =
    "mt-2 block h-16 w-full rounded-xl border-2 border-neutral-200 bg-white px-4 text-lg text-neutral-900 focus:border-warm-500 focus:outline-none";

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

          <div className="border-t border-neutral-100 pt-5">
            <p className="text-base font-bold text-neutral-800">
              추가 정보 <span className="text-sm font-medium text-neutral-400">(선택)</span>
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              입력하시면 딱 맞는 골프 여행을 추천해드려요.
            </p>

            <div className="mt-4 space-y-5">
              <div>
                <label htmlFor="birthDate" className="block text-base font-bold text-neutral-800">
                  생년월일
                </label>
                <input
                  id="birthDate"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => update("birthDate", e.target.value)}
                  className={fieldClass(!!fieldErrors.birthDate)}
                />
                {fieldErrors.birthDate && (
                  <p className="mt-1.5 text-sm font-medium text-brand-600">
                    {fieldErrors.birthDate}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="gender" className="block text-base font-bold text-neutral-800">
                  성별
                </label>
                <select
                  id="gender"
                  value={form.gender}
                  onChange={(e) => update("gender", e.target.value)}
                  className={selectClass}
                >
                  <option value="">선택 안 함</option>
                  {GENDER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="golfCareer" className="block text-base font-bold text-neutral-800">
                  골프 구력
                </label>
                <select
                  id="golfCareer"
                  value={form.golfCareer}
                  onChange={(e) => update("golfCareer", e.target.value)}
                  className={selectClass}
                >
                  <option value="">선택 안 함</option>
                  {GOLF_CAREER_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="handicap" className="block text-base font-bold text-neutral-800">
                  핸디캡
                </label>
                <select
                  id="handicap"
                  value={form.handicap}
                  onChange={(e) => update("handicap", e.target.value)}
                  className={selectClass}
                >
                  <option value="">선택 안 함</option>
                  {HANDICAP_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="region" className="block text-base font-bold text-neutral-800">
                  거주 지역
                </label>
                <select
                  id="region"
                  value={form.region}
                  onChange={(e) => update("region", e.target.value)}
                  className={selectClass}
                >
                  <option value="">선택 안 함</option>
                  {REGION_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-100 pt-5">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={agreeAll}
                onChange={(e) => toggleAgreeAll(e.target.checked)}
                className="h-6 w-6 shrink-0 accent-warm-500"
              />
              <span className="text-base font-bold text-neutral-900">전체 동의</span>
            </label>

            <div className="mt-3 space-y-3 border-t border-neutral-100 pt-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={agree.terms}
                  onChange={(e) => toggleAgree("terms", e.target.checked)}
                  className="h-6 w-6 shrink-0 accent-warm-500"
                />
                <span className="text-base text-neutral-700">
                  <span className="font-bold text-brand-600">[필수]</span> 이용약관 동의
                </span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={agree.privacy}
                  onChange={(e) => toggleAgree("privacy", e.target.checked)}
                  className="h-6 w-6 shrink-0 accent-warm-500"
                />
                <span className="text-base text-neutral-700">
                  <span className="font-bold text-brand-600">[필수]</span> 개인정보 수집·이용 동의
                </span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={agree.marketing}
                  onChange={(e) => toggleAgree("marketing", e.target.checked)}
                  className="h-6 w-6 shrink-0 accent-warm-500"
                />
                <span className="text-base text-neutral-700">
                  <span className="font-bold text-neutral-400">[선택]</span> 마케팅 정보 수신 동의
                </span>
              </label>
            </div>
            {fieldErrors.terms && (
              <p className="mt-2 text-sm font-medium text-brand-600">
                {fieldErrors.terms}
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
          <Link href={loginHref} className="font-bold text-warm-600 underline">
            로그인
          </Link>
        </p>
      </div>
    </main>
  );
}
