// 어드민 상품 목록 테이블 — 체크박스 선택·전체선택·일괄 삭제·개별 삭제 + 행 클릭으로 상세 이동 + 메인노출(특가/랜딩) 토글.
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export type ProductRow = {
  id: string;
  destination: string;
  golfCourse: string | null;
  departureLabel: string | null;
  departureDateText: string;
  nights: number;
  price: number;
  capacity: number;
  capacityLabel: string | null;
  autoImported: boolean;
  mediaCount: number;
  totalBookings: number;
  cancelledBookings: number;
  activeBookings: number;
  createdAtText: string;
};

const MAX_FEATURED = 3;

function formatPrice(price: number) {
  return new Intl.NumberFormat("ko-KR").format(price);
}

export default function ProductsTable({
  rows,
  initialFeaturedIds,
  initialLandingId,
}: {
  rows: ProductRow[];
  initialFeaturedIds: string[];
  initialLandingId: string;
}) {
  const router = useRouter();
  // 삭제 직후 즉시 행을 사라지게 하려면 optimistic 로컬 state 유지.
  // 서버 props가 갱신되면 다시 동기화.
  const [localRows, setLocalRows] = useState<ProductRow[]>(rows);
  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  // 메인 노출 상태 (특가 최대 3개 / 랜딩 1개) — 토글 시 낙관적 업데이트 후 PATCH.
  const [featuredIds, setFeaturedIds] = useState<string[]>(initialFeaturedIds);
  const [landingId, setLandingId] = useState<string>(initialLandingId);
  const [featureBusy, setFeatureBusy] = useState(false);
  const [featureError, setFeatureError] = useState("");

  useEffect(() => {
    setFeaturedIds(initialFeaturedIds);
  }, [initialFeaturedIds]);
  useEffect(() => {
    setLandingId(initialLandingId);
  }, [initialLandingId]);

  async function patchFeatured(payload: {
    featuredProductIds?: string[];
    landingProductId?: string | null;
  }) {
    setFeatureError("");
    setFeatureBusy(true);
    const res = await fetch("/api/admin/featured-products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setFeatureBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setFeatureError(data.error ?? "설정에 실패했습니다.");
      return false;
    }
    startTransition(() => router.refresh());
    return true;
  }

  async function toggleFeatured(id: string) {
    if (featureBusy) return;
    const isOn = featuredIds.includes(id);
    let next: string[];
    if (isOn) {
      next = featuredIds.filter((x) => x !== id);
    } else {
      if (featuredIds.length >= MAX_FEATURED) {
        setFeatureError(`특가 상품은 최대 ${MAX_FEATURED}개까지 선택할 수 있습니다.`);
        return;
      }
      next = [...featuredIds, id];
    }
    const prev = featuredIds;
    setFeaturedIds(next);
    const ok = await patchFeatured({ featuredProductIds: next });
    if (!ok) setFeaturedIds(prev);
  }

  async function toggleLanding(id: string) {
    if (featureBusy) return;
    const isOn = landingId === id;
    const next = isOn ? "" : id;
    const prev = landingId;
    setLandingId(next);
    const ok = await patchFeatured({ landingProductId: next });
    if (!ok) setLandingId(prev);
  }

  const selectableIds = useMemo(
    () => localRows.filter((r) => r.activeBookings === 0).map((r) => r.id),
    [localRows]
  );
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableIds));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (
      !window.confirm(
        `선택한 ${selected.size}개 상품을 삭제하시겠어요? 되돌릴 수 없습니다.`
      )
    ) {
      return;
    }
    setError("");
    setBulkBusy(true);
    const ids = Array.from(selected);
    const res = await fetch("/api/admin/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    setBulkBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "일괄 삭제에 실패했습니다.");
      return;
    }
    const data = (await res.json()) as {
      deleted: number;
      skipped: { id: string; reason: string }[];
    };
    const skippedIds = new Set(data.skipped.map((s) => s.id));
    const deletedIds = new Set(ids.filter((id) => !skippedIds.has(id)));
    // 즉시 화면에서 사라지게 — 서버 refresh 기다리지 않음.
    setLocalRows((prev) => prev.filter((r) => !deletedIds.has(r.id)));
    setSelected(new Set());
    if (data.skipped.length > 0) {
      setError(
        `${data.deleted}건 삭제됨. ${data.skipped.length}건은 건너뜀(활성 예약 등).`
      );
    }
    startTransition(() => router.refresh());
  }

  async function handleSingleDelete(row: ProductRow) {
    if (
      !window.confirm(
        `'${row.destination}' 상품을 삭제하시겠어요? 되돌릴 수 없습니다.`
      )
    ) {
      return;
    }
    setError("");
    setBusyId(row.id);
    const res = await fetch(`/api/admin/products/${row.id}`, {
      method: "DELETE",
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "삭제에 실패했습니다.");
      return;
    }
    // 즉시 화면에서 사라지게.
    setLocalRows((prev) => prev.filter((r) => r.id !== row.id));
    setSelected((prev) => {
      if (!prev.has(row.id)) return prev;
      const next = new Set(prev);
      next.delete(row.id);
      return next;
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3">
        <span className="text-sm font-bold text-neutral-800">
          메인 노출 설정
        </span>
        <span className="inline-flex items-center gap-1 text-sm text-neutral-600">
          <span className="inline-block h-2 w-2 rounded-full bg-warm-500" />
          특가 {featuredIds.length}/{MAX_FEATURED}
        </span>
        <span className="inline-flex items-center gap-1 text-sm text-neutral-600">
          <span className="inline-block h-2 w-2 rounded-full bg-brand-500" />
          랜딩 {landingId ? "1" : "0"}/1
        </span>
        {featureError && (
          <p className="text-sm font-medium text-red-600">{featureError}</p>
        )}
      </div>

      {(selected.size > 0 || error) && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-warm-50/50 px-4 py-3">
          <span className="text-sm font-bold text-neutral-800">
            {selected.size}개 선택됨
          </span>
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={selected.size === 0 || bulkBusy}
            className="inline-flex h-9 items-center rounded-lg bg-red-600 px-4 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {bulkBusy ? "삭제 중…" : "선택 항목 삭제"}
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            disabled={selected.size === 0 || bulkBusy}
            className="inline-flex h-9 items-center rounded-lg border border-neutral-300 px-3 text-sm font-bold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
          >
            선택 해제
          </button>
          {error && (
            <p className="text-sm font-medium text-red-600">{error}</p>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        <table className="w-full text-sm md:text-base">
          <thead className="bg-neutral-50 text-sm text-neutral-500">
            <tr className="border-b border-neutral-200">
              <th className="w-10 px-3 py-3 text-center">
                <input
                  type="checkbox"
                  aria-label="전체 선택"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  disabled={selectableIds.length === 0}
                  className="h-4 w-4 cursor-pointer accent-warm-500"
                />
              </th>
              <th className="px-4 py-3 text-left font-bold">목적지</th>
              <th className="px-4 py-3 text-left font-bold">골프장</th>
              <th className="px-4 py-3 text-left font-bold">출발</th>
              <th className="px-4 py-3 text-left font-bold">박수</th>
              <th className="px-4 py-3 text-left font-bold">가격</th>
              <th className="px-4 py-3 text-left font-bold">정원</th>
              <th className="px-4 py-3 text-left font-bold">출처</th>
              <th className="px-4 py-3 text-left font-bold">미디어</th>
              <th className="px-4 py-3 text-left font-bold">예약</th>
              <th className="px-4 py-3 text-left font-bold whitespace-nowrap">
                메인 노출
              </th>
              <th className="px-4 py-3 text-left font-bold whitespace-nowrap">
                등록일시
              </th>
              <th className="px-4 py-3 text-right font-bold">관리</th>
            </tr>
          </thead>
          <tbody>
            {localRows.map((p) => {
              const deletable = p.activeBookings === 0;
              const checked = selected.has(p.id);
              const isFeatured = featuredIds.includes(p.id);
              const isLanding = landingId === p.id;
              const featuredDisabled =
                featureBusy || (!isFeatured && featuredIds.length >= MAX_FEATURED);
              return (
                <tr key={p.id} className="border-b border-neutral-100">
                  <td className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      aria-label={`${p.destination} 선택`}
                      checked={checked}
                      onChange={() => toggleOne(p.id)}
                      disabled={!deletable}
                      title={!deletable ? "활성 예약이 있어 선택 불가" : ""}
                      className="h-4 w-4 cursor-pointer accent-warm-500 disabled:cursor-not-allowed disabled:opacity-40"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/products/${p.id}`}
                      className="font-bold text-neutral-900 hover:text-warm-600"
                    >
                      {p.destination}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    {p.golfCourse ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-neutral-700 whitespace-nowrap">
                    {p.departureLabel ?? p.departureDateText}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">{p.nights}박</td>
                  <td className="px-4 py-3 font-bold text-warm-600 whitespace-nowrap">
                    {formatPrice(p.price)}원
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    {p.capacityLabel ??
                      (p.capacity > 0 ? `${p.capacity}명` : "—")}
                  </td>
                  <td className="px-4 py-3">
                    {p.autoImported ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                        자동등록
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-600 ring-1 ring-neutral-200">
                        수동
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">{p.mediaCount}개</td>
                  <td className="px-4 py-3 text-neutral-700 whitespace-nowrap">
                    {p.totalBookings}건
                    {p.cancelledBookings > 0 && (
                      <span className="ml-1 text-xs text-neutral-400">
                        (취소 {p.cancelledBookings})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleFeatured(p.id)}
                        disabled={featuredDisabled}
                        title={
                          isFeatured
                            ? "특가 해제"
                            : featuredDisabled
                              ? `최대 ${MAX_FEATURED}개까지 선택 가능`
                              : "특가로 설정"
                        }
                        className={[
                          "inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                          isFeatured
                            ? "bg-warm-500 text-white hover:bg-warm-600"
                            : "border border-warm-300 text-warm-700 hover:bg-warm-50",
                        ].join(" ")}
                      >
                        {isFeatured ? "✓ 특가" : "특가"}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleLanding(p.id)}
                        disabled={featureBusy}
                        title={isLanding ? "랜딩 해제" : "랜딩 초특가로 설정"}
                        className={[
                          "inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                          isLanding
                            ? "bg-brand-500 text-white hover:bg-brand-600"
                            : "border border-brand-300 text-brand-700 hover:bg-brand-50",
                        ].join(" ")}
                      >
                        {isLanding ? "✓ 랜딩" : "랜딩"}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-500 whitespace-nowrap text-sm">
                    {p.createdAtText}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/products/${p.id}/edit`}
                        className="inline-flex h-9 items-center rounded-lg border border-warm-300 px-3 text-sm font-bold text-warm-700 transition-colors hover:bg-warm-50"
                      >
                        수정
                      </Link>
                      {deletable ? (
                        <button
                          type="button"
                          onClick={() => handleSingleDelete(p)}
                          disabled={busyId === p.id}
                          className="inline-flex h-9 items-center rounded-lg border border-red-300 px-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                        >
                          {busyId === p.id ? "삭제 중…" : "삭제"}
                        </button>
                      ) : (
                        <span
                          className="text-xs text-neutral-400 whitespace-nowrap"
                          title="취소되지 않은 예약이 연결되어 삭제할 수 없습니다."
                        >
                          활성 예약 {p.activeBookings}건
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
