// 밴드 OAuth 연결 + 대상 밴드 선택 카드 — 어드민 설정 페이지에서 사용.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BandSummary } from "@/lib/band-api-client";

type Props = {
  connected: boolean;
  selectedBandKey: string;
  bands: BandSummary[];
  loadError: string | null;
};

export default function BandConnectionCard({
  connected,
  selectedBandKey,
  bands,
  loadError,
}: Props) {
  const router = useRouter();
  const [bandKey, setBandKey] = useState(selectedBandKey);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSave() {
    setSaving(true);
    setSavedMsg("");
    setErrorMsg("");
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bandKey }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error ?? "저장에 실패했습니다.");
    } else {
      setSavedMsg("대상 밴드가 저장되었습니다.");
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 md:p-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-neutral-900">네이버 밴드 연결</h2>
          <p className="mt-2 text-sm text-neutral-600">
            공식 Open API(OAuth)로 연결합니다. 한 번 연결하면 만료 전까지 자동으로 사용됩니다.
          </p>
        </div>
        <a
          href="/api/admin/band/oauth/start"
          className="flex h-12 items-center rounded-xl bg-warm-500 px-6 text-base font-black text-white transition-colors hover:bg-warm-600"
        >
          {connected ? "밴드 다시 연결" : "밴드 연결하기"}
        </a>
      </div>

      {!connected && (
        <p className="mt-5 rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
          아직 밴드 계정이 연결되지 않았습니다. 위 버튼을 눌러 동의 후 다시 돌아오세요.
        </p>
      )}

      {connected && (
        <div className="mt-6">
          <p className="text-base font-bold text-neutral-700">대상 밴드 선택</p>
          <p className="mt-1 text-sm text-neutral-500">
            자동 크롤링이 이 밴드의 게시글을 대상으로 동작합니다.
          </p>

          {loadError && (
            <p className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">
              밴드 목록 로드 실패: {loadError}
            </p>
          )}

          {!loadError && bands.length === 0 && (
            <p className="mt-4 rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
              연결된 계정에 가입된 밴드가 없습니다.
            </p>
          )}

          {!loadError && bands.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
              <select
                value={bandKey}
                onChange={(e) => setBandKey(e.target.value)}
                className="h-12 flex-1 rounded-xl border-2 border-neutral-200 bg-white px-4 text-base font-medium text-neutral-900 focus:border-warm-500 focus:outline-none"
              >
                <option value="">밴드를 선택하세요</option>
                {bands.map((b) => (
                  <option key={b.bandKey} value={b.bandKey}>
                    {b.name}
                    {typeof b.memberCount === "number" ? ` · ${b.memberCount}명` : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !bandKey || bandKey === selectedBandKey}
                className="flex h-12 items-center rounded-xl bg-warm-500 px-6 text-base font-black text-white transition-colors hover:bg-warm-600 disabled:bg-neutral-300"
              >
                {saving ? "저장 중..." : "대상 밴드 저장"}
              </button>
            </div>
          )}

          {savedMsg && (
            <p className="mt-4 rounded-xl bg-warm-50 px-4 py-3 text-sm font-bold text-warm-700">
              {savedMsg}
            </p>
          )}
          {errorMsg && (
            <p className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">
              {errorMsg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
