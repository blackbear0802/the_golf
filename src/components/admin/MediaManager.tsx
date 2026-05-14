// 어드민 상품 미디어 관리 (추가/캡션·타입 수정/삭제/순서 변경)
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export type MediaType = "golf" | "accommodation" | "dining" | "youtube";

export type MediaItem = {
  id: string;
  type: MediaType;
  url: string;
  caption: string | null;
  order: number;
};

const TYPE_OPTIONS: { value: MediaType; label: string }[] = [
  { value: "golf", label: "골프장" },
  { value: "accommodation", label: "숙소" },
  { value: "dining", label: "식사" },
  { value: "youtube", label: "유튜브" },
];

const TYPE_LABEL: Record<MediaType, string> = {
  golf: "골프장",
  accommodation: "숙소",
  dining: "식사",
  youtube: "유튜브",
};

export default function MediaManager({
  productId,
  initial,
}: {
  productId: string;
  initial: MediaItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<MediaItem[]>(initial);
  const [draft, setDraft] = useState<{ type: MediaType; url: string; caption: string }>({
    type: "golf",
    url: "",
    caption: "",
  });
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function addMedia(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const url = draft.url.trim();
    if (!url) {
      setError("URL을 입력해주세요.");
      return;
    }

    const res = await fetch(`/api/admin/products/${productId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: draft.type,
        url,
        caption: draft.caption.trim() || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "추가에 실패했습니다.");
      return;
    }
    const created = (await res.json()) as MediaItem;
    setItems((prev) => [...prev, created]);
    setDraft({ type: draft.type, url: "", caption: "" });
    refresh();
  }

  async function patchMedia(mediaId: string, body: Partial<MediaItem>) {
    setBusyId(mediaId);
    setError("");
    const res = await fetch(
      `/api/admin/products/${productId}/media/${mediaId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "수정에 실패했습니다.");
      return false;
    }
    return true;
  }

  async function deleteMedia(mediaId: string) {
    if (!confirm("이 미디어를 삭제할까요?")) return;
    setBusyId(mediaId);
    setError("");
    const res = await fetch(
      `/api/admin/products/${productId}/media/${mediaId}`,
      { method: "DELETE" }
    );
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "삭제에 실패했습니다.");
      return;
    }
    setItems((prev) => prev.filter((m) => m.id !== mediaId));
    refresh();
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;

    const a = items[index];
    const b = items[target];
    const ok1 = await patchMedia(a.id, { order: b.order });
    if (!ok1) return;
    const ok2 = await patchMedia(b.id, { order: a.order });
    if (!ok2) return;

    setItems((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [
        { ...next[target], order: a.order },
        { ...next[index], order: b.order },
      ];
      return next;
    });
    refresh();
  }

  async function changeType(mediaId: string, type: MediaType) {
    const ok = await patchMedia(mediaId, { type });
    if (!ok) return;
    setItems((prev) => prev.map((m) => (m.id === mediaId ? { ...m, type } : m)));
    refresh();
  }

  async function changeCaption(mediaId: string, caption: string) {
    const ok = await patchMedia(mediaId, { caption });
    if (!ok) return;
    setItems((prev) =>
      prev.map((m) => (m.id === mediaId ? { ...m, caption: caption || null } : m))
    );
    refresh();
  }

  return (
    <section className="space-y-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl md:text-2xl font-black text-neutral-900">미디어</h2>
        <p className="text-sm text-neutral-500">{items.length}개</p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 p-8 text-center text-base text-neutral-500">
          등록된 미디어가 없습니다. 아래 폼에서 추가해주세요.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((m, i) => (
            <li
              key={m.id}
              className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-5"
            >
              <div className="flex flex-col gap-4 md:flex-row">
                <MediaPreview type={m.type} url={m.url} />
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-7 items-center rounded-full bg-neutral-100 px-3 text-xs font-bold text-neutral-700">
                      #{i + 1}
                    </span>
                    <select
                      value={m.type}
                      disabled={busyId === m.id || pending}
                      onChange={(e) => changeType(m.id, e.target.value as MediaType)}
                      className="h-9 rounded-lg border border-neutral-300 bg-white px-2 text-sm font-bold text-neutral-800 disabled:opacity-50"
                    >
                      {TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-sm text-neutral-500 hover:text-warm-600 hover:underline"
                    >
                      {m.url}
                    </a>
                  </div>
                  <CaptionEditor
                    value={m.caption ?? ""}
                    disabled={busyId === m.id || pending}
                    onSave={(v) => changeCaption(m.id, v)}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0 || busyId === m.id || pending}
                      className="h-9 rounded-lg border border-neutral-300 px-3 text-sm font-bold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-40"
                    >
                      ↑ 위로
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === items.length - 1 || busyId === m.id || pending}
                      className="h-9 rounded-lg border border-neutral-300 px-3 text-sm font-bold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-40"
                    >
                      ↓ 아래로
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMedia(m.id)}
                      disabled={busyId === m.id || pending}
                      className="ml-auto h-9 rounded-lg border border-brand-500 px-3 text-sm font-bold text-brand-700 transition-colors hover:bg-brand-50 disabled:opacity-40"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={addMedia}
        className="rounded-2xl border-2 border-warm-100 bg-warm-50/40 p-5 md:p-6"
      >
        <p className="text-base font-black text-neutral-900">새 미디어 추가</p>
        <div className="mt-4 grid gap-3 md:grid-cols-[140px_1fr]">
          <select
            value={draft.type}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, type: e.target.value as MediaType }))
            }
            className="h-12 rounded-xl border-2 border-neutral-200 bg-white px-3 text-base font-bold text-neutral-800 focus:border-warm-500 focus:outline-none"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {TYPE_LABEL[o.value]}
              </option>
            ))}
          </select>
          <input
            type="url"
            value={draft.url}
            onChange={(e) => setDraft((prev) => ({ ...prev, url: e.target.value }))}
            placeholder={
              draft.type === "youtube"
                ? "https://www.youtube.com/watch?v=..."
                : "https://image.example.com/photo.jpg"
            }
            className="h-12 rounded-xl border-2 border-neutral-200 bg-white px-4 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-warm-500 focus:outline-none"
            required
          />
        </div>
        <input
          type="text"
          value={draft.caption}
          onChange={(e) => setDraft((prev) => ({ ...prev, caption: e.target.value }))}
          placeholder="캡션 (선택)"
          className="mt-3 h-12 w-full rounded-xl border-2 border-neutral-200 bg-white px-4 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-warm-500 focus:outline-none"
        />
        {error && (
          <p className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="mt-4 h-12 rounded-xl bg-warm-500 px-6 text-base font-black text-white transition-colors hover:bg-warm-600"
        >
          추가
        </button>
      </form>
    </section>
  );
}

function MediaPreview({ type, url }: { type: MediaType; url: string }) {
  if (type === "youtube") {
    const id = extractYouTubeId(url);
    const thumb = id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : null;
    return (
      <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-xl bg-neutral-100 md:h-28 md:w-40">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="youtube" className="h-full w-full object-cover" />
        ) : (
          <span className="text-3xl">▶</span>
        )}
      </div>
    );
  }
  return (
    <div className="h-28 w-full overflow-hidden rounded-xl bg-neutral-100 md:h-28 md:w-40">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className="h-full w-full object-cover"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    </div>
  );
}

function CaptionEditor({
  value,
  disabled,
  onSave,
}: {
  value: string;
  disabled: boolean;
  onSave: (v: string) => void;
}) {
  const [text, setText] = useState(value);
  const dirty = text !== value;
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        placeholder="캡션"
        className="h-10 flex-1 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-warm-500 focus:outline-none disabled:opacity-50"
      />
      {dirty && (
        <button
          type="button"
          onClick={() => onSave(text.trim())}
          disabled={disabled}
          className="h-10 rounded-lg bg-warm-500 px-3 text-sm font-bold text-white hover:bg-warm-600 disabled:opacity-50"
        >
          저장
        </button>
      )}
    </div>
  );
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}
