// 챗 페이지 셸 — 사이드바(히스토리) + 본문(ChatRoom)을 묶고 세션 전환 상태 관리.
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import ChatRoom from "./ChatRoom";
import ChatSidebar from "./ChatSidebar";

const SESSION_ID_KEY = "thegolf.chat.session-id";

export default function ChatLayout({ initial }: { initial: string }) {
  const { status: authStatus } = useSession();
  // null = 새 챗. string = DB 세션 id 로드.
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // 사이드바 목록 강제 갱신용 카운터 — 새 세션 생성·삭제 시 증가.
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  // 마운트: 페이지 새로고침 시 같은 세션을 이어볼 수 있도록 sessionStorage에서 복원.
  // initial 파라미터(?initial=...)가 있으면 새 챗으로 시작(검색 진입 동선 우선).
  useEffect(() => {
    if (authStatus === "loading") return;
    if (initial.trim()) {
      setActiveSessionId(null);
    } else if (authStatus === "authenticated") {
      try {
        const stored = sessionStorage.getItem(SESSION_ID_KEY);
        setActiveSessionId(stored || null);
      } catch {
        setActiveSessionId(null);
      }
    } else {
      setActiveSessionId(null);
    }
    setHydrated(true);
  }, [authStatus, initial]);

  function handleSelect(id: string) {
    setActiveSessionId(id);
    try {
      sessionStorage.setItem(SESSION_ID_KEY, id);
    } catch {
      // 무시
    }
  }

  function handleNew() {
    setActiveSessionId(null);
    try {
      sessionStorage.removeItem(SESSION_ID_KEY);
    } catch {
      // 무시
    }
  }

  function handleSessionCreated(id: string) {
    setActiveSessionId(id);
    setSidebarRefreshKey((k) => k + 1);
  }

  if (!hydrated) {
    return <div className="min-h-[calc(100svh-5rem)]" />;
  }

  return (
    <div className="flex min-h-[calc(100svh-5rem)]">
      {authStatus === "authenticated" && (
        <ChatSidebar
          activeSessionId={activeSessionId}
          refreshKey={sidebarRefreshKey}
          onSelect={handleSelect}
          onNew={handleNew}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      <div className="min-w-0 flex-1">
        {/* 모바일 사이드바 토글 */}
        {authStatus === "authenticated" && (
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="ml-4 mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
            >
              ☰ 히스토리
            </button>
          </div>
        )}

        {/* ChatRoom은 activeSessionId 바뀔 때마다 remount해서 깔끔히 리로드 */}
        <ChatRoom
          key={activeSessionId ?? "new"}
          initial={initial}
          activeSessionId={activeSessionId}
          onSessionCreated={handleSessionCreated}
        />
      </div>
    </div>
  );
}
