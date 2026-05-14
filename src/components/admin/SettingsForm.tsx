// 어드민 시스템 설정 폼 (담당자 정보 + 네이버 밴드 인증 + 크롤링 활성화)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type SettingsInitial = {
  operatorName: string;
  operatorPhone: string;
  operatorEmail: string;
  bandId: string;
  bandNidAutMasked: string;
  bandNidSesMasked: string;
  crawlEnabled: boolean;
};

type FormState = {
  operatorName: string;
  operatorPhone: string;
  operatorEmail: string;
  bandId: string;
  bandNidAut: string;
  bandNidSes: string;
  crawlEnabled: boolean;
};

export default function SettingsForm({ initial }: { initial: SettingsInitial }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    operatorName: initial.operatorName,
    operatorPhone: initial.operatorPhone,
    operatorEmail: initial.operatorEmail,
    bandId: initial.bandId,
    bandNidAut: "",
    bandNidSes: "",
    crawlEnabled: initial.crawlEnabled,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError("");
    if (success) setSuccess("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "저장에 실패했습니다.");
      setLoading(false);
      return;
    }

    setSuccess("설정이 저장되었습니다.");
    setForm((prev) => ({ ...prev, bandNidAut: "", bandNidSes: "" }));
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Section
        title="담당자 정보"
        description="자동 등록된 상품에서 공급자 연락처를 이 정보로 치환합니다."
      >
        <div className="grid gap-5 md:grid-cols-3">
          <Field label="이름" htmlFor="operatorName">
            <input
              id="operatorName"
              type="text"
              value={form.operatorName}
              onChange={(e) => update("operatorName", e.target.value)}
              placeholder="홍길동"
              className={inputClass}
            />
          </Field>
          <Field label="연락처" htmlFor="operatorPhone">
            <input
              id="operatorPhone"
              type="tel"
              value={form.operatorPhone}
              onChange={(e) => update("operatorPhone", e.target.value)}
              placeholder="010-1234-5678"
              className={inputClass}
            />
          </Field>
          <Field label="이메일" htmlFor="operatorEmail">
            <input
              id="operatorEmail"
              type="email"
              value={form.operatorEmail}
              onChange={(e) => update("operatorEmail", e.target.value)}
              placeholder="contact@thegolf.com"
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      <Section
        title="네이버 밴드 연결"
        description={
          <>
            band.us 로그인 후 개발자도구 → Application → Cookies → band.us에서{" "}
            <code className="font-mono">NID_AUT</code>,{" "}
            <code className="font-mono">NID_SES</code> 값을 복사해 붙여넣으세요. 빈 칸으로
            저장하면 기존 값을 유지합니다.
          </>
        }
      >
        <div className="grid gap-5 md:grid-cols-3">
          <Field label="밴드 ID" htmlFor="bandId">
            <input
              id="bandId"
              type="text"
              value={form.bandId}
              onChange={(e) => update("bandId", e.target.value)}
              placeholder="86xxxxx"
              className={inputClass}
            />
          </Field>
          <Field
            label={`NID_AUT ${initial.bandNidAutMasked ? `(현재: ${initial.bandNidAutMasked})` : "(미등록)"}`}
            htmlFor="bandNidAut"
          >
            <input
              id="bandNidAut"
              type="password"
              autoComplete="off"
              value={form.bandNidAut}
              onChange={(e) => update("bandNidAut", e.target.value)}
              placeholder={initial.bandNidAutMasked ? "변경 시에만 입력" : "쿠키 값 붙여넣기"}
              className={inputClass}
            />
          </Field>
          <Field
            label={`NID_SES ${initial.bandNidSesMasked ? `(현재: ${initial.bandNidSesMasked})` : "(미등록)"}`}
            htmlFor="bandNidSes"
          >
            <input
              id="bandNidSes"
              type="password"
              autoComplete="off"
              value={form.bandNidSes}
              onChange={(e) => update("bandNidSes", e.target.value)}
              placeholder={initial.bandNidSesMasked ? "변경 시에만 입력" : "쿠키 값 붙여넣기"}
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      <Section
        title="자동 크롤링"
        description="활성화하면 Vercel Cron이 주기적으로 새 게시글을 자동 등록합니다."
      >
        <label className="inline-flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.crawlEnabled}
            onChange={(e) => update("crawlEnabled", e.target.checked)}
            className="h-6 w-6 rounded border-2 border-neutral-300 accent-warm-500"
          />
          <span className="text-base font-bold text-neutral-800">
            크롤링 {form.crawlEnabled ? "활성화됨" : "비활성화됨"}
          </span>
        </label>
      </Section>

      {error && (
        <p className="rounded-xl bg-brand-50 px-4 py-3 text-base font-medium text-brand-700">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-xl bg-warm-50 px-4 py-3 text-base font-bold text-warm-700">
          {success}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="flex h-14 items-center rounded-xl bg-warm-500 px-8 text-lg font-black text-white transition-colors hover:bg-warm-600 disabled:bg-neutral-300"
        >
          {loading ? "저장 중..." : "설정 저장"}
        </button>
      </div>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 md:p-8">
      <h2 className="text-xl md:text-2xl font-black text-neutral-900">{title}</h2>
      {description && (
        <p className="mt-2 text-sm text-neutral-600">{description}</p>
      )}
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-bold text-neutral-800">
        {label}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

const inputClass =
  "block h-12 w-full rounded-xl border-2 border-neutral-200 bg-white px-4 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-warm-500 focus:outline-none";
