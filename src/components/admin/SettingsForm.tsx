// 어드민 시스템 설정 폼 (담당자 정보 + 크롤링 활성화) — 밴드 연결은 별도 카드.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type OperatorInitial = {
  name: string;
  phone: string;
  email: string;
};

export type SettingsInitial = {
  operator1: OperatorInitial;
  operator2: OperatorInitial;
  crawlEnabled: boolean;
  bodyBlocklist: string;
  bodyBlocklistUnset: boolean;
};

type FormState = {
  operator1: OperatorInitial;
  operator2: OperatorInitial;
  crawlEnabled: boolean;
  bodyBlocklist: string;
};

export default function SettingsForm({ initial }: { initial: SettingsInitial }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    operator1: { ...initial.operator1 },
    operator2: { ...initial.operator2 },
    crawlEnabled: initial.crawlEnabled,
    bodyBlocklist: initial.bodyBlocklist,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError("");
    if (success) setSuccess("");
  }

  function updateOperator(
    slot: "operator1" | "operator2",
    field: keyof OperatorInitial,
    value: string
  ) {
    setForm((prev) => ({ ...prev, [slot]: { ...prev[slot], [field]: value } }));
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
      body: JSON.stringify({
        operator1: form.operator1,
        operator2: form.operator2,
        crawlEnabled: form.crawlEnabled,
        bodyBlocklist: form.bodyBlocklist,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "저장에 실패했습니다.");
      setLoading(false);
      return;
    }

    setSuccess("설정이 저장되었습니다.");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Section
        title="담당자 정보 (2명)"
        description="자동 등록된 상품에서 공급자 연락처를 두 담당자 정보로 치환합니다."
      >
        <div className="space-y-6">
          <OperatorRow
            label="담당자 1"
            slot="operator1"
            value={form.operator1}
            onChange={(field, v) => updateOperator("operator1", field, v)}
          />
          <div className="border-t border-neutral-200" />
          <OperatorRow
            label="담당자 2"
            slot="operator2"
            value={form.operator2}
            onChange={(field, v) => updateOperator("operator2", field, v)}
          />
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

      <Section
        title="빠른등록 본문 차단어"
        description="줄 단위로 하나씩 입력. 본문 어디든 이 단어가 포함된 줄은 등록 시 통째로 삭제됩니다(예: 공급자명·연락 안내 문구)."
      >
        <textarea
          rows={6}
          value={form.bodyBlocklist}
          onChange={(e) => update("bodyBlocklist", e.target.value)}
          placeholder={
            initial.bodyBlocklistUnset
              ? "담당자\n문의하기\n문의\n위더스골프\n\n(미설정 — 위 기본값이 적용 중. 저장하면 입력한 목록으로 대체됩니다.)"
              : "담당자\n문의하기\n문의\n위더스골프"
          }
          className="block w-full rounded-xl border-2 border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-warm-500 focus:outline-none font-mono"
        />
        <p className="mt-2 text-sm text-neutral-500">
          비워두고 저장하면 <span className="font-bold">차단 없음</span>. 한 줄에 하나씩, 부분 일치(line.includes).
        </p>
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

function OperatorRow({
  label,
  slot,
  value,
  onChange,
}: {
  label: string;
  slot: "operator1" | "operator2";
  value: OperatorInitial;
  onChange: (field: keyof OperatorInitial, value: string) => void;
}) {
  return (
    <div>
      <p className="text-base font-bold text-neutral-700">{label}</p>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        <Field label="이름" htmlFor={`${slot}-name`}>
          <input
            id={`${slot}-name`}
            type="text"
            value={value.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="홍길동"
            className={inputClass}
          />
        </Field>
        <Field label="연락처" htmlFor={`${slot}-phone`}>
          <input
            id={`${slot}-phone`}
            type="tel"
            value={value.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            placeholder="010-1234-5678"
            className={inputClass}
          />
        </Field>
        <Field label="이메일" htmlFor={`${slot}-email`}>
          <input
            id={`${slot}-email`}
            type="email"
            value={value.email}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="contact@thegolfer.co.kr"
            className={inputClass}
          />
        </Field>
      </div>
    </div>
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
