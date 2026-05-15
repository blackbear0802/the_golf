// 어드민 수동 크롤 실행 카드 — /admin/settings에서 한 번 실행하고 결과를 인라인 표시.
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type TriggerResult =
  | {
      ok: true;
      totalListed: number;
      newCandidates: number;
      imported: number;
      skipped: number;
      failed: number;
      errors: { postId: string; reason: string }[];
    }
  | {
      ok: false;
      skipped?: "disabled" | "missing_credentials";
      reason?: string;
      message?: string;
      error?: string;
    };

export default function CrawlTriggerCard() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriggerResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleRun() {
    setLoading(true);
    setResult(null);
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/crawl/trigger", { method: "POST" });
      const data = (await res.json()) as TriggerResult;
      setResult(data);
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-neutral-900">수동 크롤 실행</h2>
          <p className="mt-2 text-sm text-neutral-600">
            지금 한 번 밴드 게시글을 가져와 자동 상품으로 등록합니다. 한 번 실행에 최대 5건,
            이미 등록된 글은 건너뜁니다.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRun}
          disabled={loading}
          className="flex h-12 items-center rounded-xl bg-warm-500 px-6 text-base font-black text-white transition-colors hover:bg-warm-600 disabled:bg-neutral-300"
        >
          {loading ? "실행 중..." : "지금 한 번 실행"}
        </button>
      </div>

      {errorMsg && (
        <p className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-base font-medium text-brand-700">
          요청 실패: {errorMsg}
        </p>
      )}

      {result && <ResultPanel result={result} />}
    </div>
  );
}

function ResultPanel({ result }: { result: TriggerResult }) {
  if (!result.ok) {
    const msg =
      result.message ??
      result.reason ??
      result.error ??
      (result.skipped === "disabled"
        ? "크롤링이 비활성 상태입니다."
        : "쿠키 또는 밴드 ID가 등록되지 않았습니다.");
    return (
      <div className="mt-5 rounded-xl border-2 border-brand-300 bg-brand-50 px-4 py-4">
        <p className="text-base font-bold text-brand-700">실행 실패</p>
        <p className="mt-1 text-sm text-brand-700">{msg}</p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="목록" value={result.totalListed} />
        <Stat label="신규 후보" value={result.newCandidates} />
        <Stat label="등록" value={result.imported} tone="ok" />
        <Stat label="건너뜀" value={result.skipped} />
        <Stat label="실패" value={result.failed} tone={result.failed > 0 ? "warn" : "muted"} />
      </div>

      {result.imported > 0 && (
        <p className="text-sm text-neutral-700">
          새 상품이 등록되었습니다.{" "}
          <Link href="/admin/products?source=auto" className="font-bold text-warm-600 underline">
            자동 등록 상품 보기
          </Link>
        </p>
      )}

      {result.errors.length > 0 && (
        <details className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <summary className="cursor-pointer text-sm font-bold text-neutral-800">
            실패/건너뜀 사유 {result.errors.length}건
          </summary>
          <ul className="mt-3 space-y-2 text-sm text-neutral-700">
            {result.errors.map((e, i) => (
              <li key={i} className="font-mono">
                <span className="text-neutral-500">[{e.postId}]</span> {e.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: number;
  tone?: "ok" | "warn" | "muted";
}) {
  const color =
    tone === "ok"
      ? "text-warm-600"
      : tone === "warn"
      ? "text-brand-600"
      : "text-neutral-900";
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
      <p className="text-xs font-bold text-neutral-500">{label}</p>
      <p className={`mt-1 text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}
