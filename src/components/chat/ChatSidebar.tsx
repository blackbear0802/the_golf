// 챗 히스토리 사이드바 — Gemini 스타일. 데스크톱은 고정, 모바일은 드로어.
"use client";

import { useEffect, useState } from "react";
import { formatDateTimeKST } from "@/lib/format-datetime";

export type ChatSessionListItem = {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: string;
};

type Props = {
  activeSessionId: string | null;
  // 부모(ChatLayout)가 외부 이벤트(첫 메시지로 새 세션 생성 등)로 리스트 갱신을 요청.
  refreshKey: number;
  onSelect: (id: string) => void;
  onNew: () => void;
  // 모바일 드로어 제어
  open: boolean;
  onClose: () => void;
};

export default function ChatSidebar({
  activeSessionId,
  refreshKey,
  onSelect,
  onNew,
  open,
  onClose,
}: Props) {
  const [sessions, setSessions] = useState<ChatSessionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/chat/sessions")
      .then((r) => (r.ok ? r.json() : { sessions: [] }))
      .then((data: { sessions?: ChatSessionListItem[] }) => {
        if (cancelled) return;
        setSessions(Array.isArray(data.sessions) ? data.sessions : []);
      })
      .catch(() => {
        if (!cancelled) setSessions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm("이 대화를 삭제할까요? 되돌릴 수 없습니다.")) return;
    setDeletingId(id);
    const res = await fetch(`/api/chat/sessions/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) return;
    setSessions((prev) => prev.filter((s) => s.id !== id));
    // 활성 세션이 삭제됐다면 새 챗으로 전환
    if (activeSessionId === id) onNew();
  }

  const content = (
    <div className="flex h-full w-full flex-col border-r border-neutral-200 bg-neutral-50">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <p className="text-sm font-black text-neutral-900">대화 히스토리</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100 md:hidden"
          aria-label="사이드바 닫기"
        >
          ✕
        </button>
      </div>

      <div className="px-3 py-3">
        <button
          type="button"
          onClick={() => {
            onNew();
            onClose();
          }}
          className="flex h-10 w-full items-center justify-center gap-1 rounded-xl bg-warm-500 px-3 text-sm font-bold text-white transition-colors hover:bg-warm-600"
        >
          <span className="text-base leading-none">＋</span>
          <span>새 챗</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {loading && sessions.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-neutral-400">불러오는 중…</p>
        ) : sessions.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-neutral-400">
            아직 대화가 없어요.
          </p>
        ) : (
          <ul className="space-y-1">
            {sessions.map((s) => {
              const isActive = s.id === activeSessionId;
              const time = formatDateTimeKST(s.updatedAt) ?? "";
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(s.id);
                      onClose();
                    }}
                    className={[
                      "group flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                      isActive
                        ? "bg-warm-100 text-neutral-900"
                        : "text-neutral-700 hover:bg-neutral-100",
                    ].join(" ")}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{s.title}</p>
                      <p className="mt-0.5 truncate text-xs text-neutral-400">
                        {time} · {s.messageCount}개 메시지
                      </p>
                    </div>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => handleDelete(s.id, e)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleDelete(s.id, e as unknown as React.MouseEvent);
                        }
                      }}
                      aria-label="대화 삭제"
                      title="삭제"
                      className={[
                        "shrink-0 rounded-md px-1.5 py-0.5 text-xs transition-opacity",
                        deletingId === s.id
                          ? "opacity-50"
                          : "opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600",
                      ].join(" ")}
                    >
                      🗑
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 데스크톱: 고정 사이드바 */}
      <aside className="hidden w-64 shrink-0 md:block">{content}</aside>
      {/* 모바일: 드로어 */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            onClick={onClose}
            className="absolute inset-0 bg-black/40"
            aria-hidden
          />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[80vw]">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
