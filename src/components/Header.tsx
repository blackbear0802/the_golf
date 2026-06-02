// 시니어 친화 헤더 (로고 + 사용자명/로그인 + 우측 슬라이드 햄버거 메뉴)
"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Header() {
  const { data: session, status } = useSession();
  const isAuthed = status === "authenticated";
  const isLoading = status === "loading";
  const isAdmin = session?.user?.role === "admin";
  const [menuOpen, setMenuOpen] = useState(false);

  // 메뉴 열림 동안 ESC 닫기 + 배경 스크롤 잠금
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  const menuLinkClass =
    "flex h-14 items-center rounded-xl px-4 text-lg font-bold text-neutral-800 transition-colors hover:bg-warm-50 hover:text-warm-600";

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-warm-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-3 md:px-8">
        <Link href="/" className="flex items-baseline">
          <span className="whitespace-nowrap text-xl md:text-3xl font-black tracking-tight text-warm-600">
            The Golf
          </span>
        </Link>

        <div className="flex items-center gap-2 md:gap-3">
          {isLoading ? (
            <div className="h-9 w-20 md:h-12 md:w-28" aria-hidden />
          ) : isAuthed ? (
            <span className="max-w-[8rem] truncate text-sm md:text-base text-neutral-700">
              <span className="font-bold">{session.user?.name ?? "회원"}</span> 님
            </span>
          ) : (
            <>
              <Link
                href="/login"
                className="flex h-9 md:h-12 items-center whitespace-nowrap rounded-xl border-2 border-warm-500 px-2.5 md:px-5 text-xs md:text-lg font-bold text-warm-600 transition-colors hover:bg-warm-50"
              >
                로그인
              </Link>
              <Link
                href="/register"
                className="flex h-9 md:h-12 items-center whitespace-nowrap rounded-xl bg-warm-500 px-2.5 md:px-5 text-xs md:text-lg font-bold text-white transition-colors hover:bg-warm-600"
              >
                회원가입
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="메뉴 열기"
            aria-expanded={menuOpen}
            aria-controls="main-menu"
            className="flex h-9 w-9 md:h-12 md:w-12 items-center justify-center rounded-xl border-2 border-neutral-300 text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden
            >
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </button>
        </div>
      </div>
      </header>

      {/* 우측 슬라이드 메뉴 (header 밖에 두어 backdrop-blur 기준 박스 영향 회피) */}
      <div
        className={`fixed inset-0 z-50 ${menuOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!menuOpen}
      >
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={close}
        />
        <nav
          id="main-menu"
          aria-label="주요 메뉴"
          className={`absolute right-0 top-0 flex h-full w-72 max-w-[80vw] flex-col bg-white shadow-2xl transition-transform duration-300 ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-20 items-center justify-between border-b border-warm-200 px-4">
            <span className="text-lg font-black text-warm-600">메뉴</span>
            <button
              type="button"
              onClick={close}
              aria-label="메뉴 닫기"
              className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-neutral-300 text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                aria-hidden
              >
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
            {isAuthed && (
              <Link href="/my" onClick={close} className={menuLinkClass}>
                마이페이지
              </Link>
            )}
            {isAuthed && isAdmin && (
              <Link href="/admin" onClick={close} className={menuLinkClass}>
                관리자페이지
              </Link>
            )}
            <Link href="/packages" onClick={close} className={menuLinkClass}>
              전체상품
            </Link>

            {isAuthed && (
              <>
                <div className="my-2 border-t border-neutral-200" />
                <button
                  type="button"
                  onClick={async () => {
                    close();
                    // 로그아웃 전 챗 정리 — 서버 세션 삭제 + 로컬 sessionStorage 비움.
                    // 다음 로그인 때 이전 대화가 자동 복원되지 않도록.
                    try {
                      await fetch("/api/chat/session", { method: "DELETE" });
                    } catch {
                      // 네트워크 실패해도 로그아웃은 진행
                    }
                    try {
                      sessionStorage.removeItem("thegolf.chat.messages");
                    } catch {
                      // SSR/접근 불가 환경 무시
                    }
                    signOut({ callbackUrl: "/" });
                  }}
                  className="flex h-14 items-center rounded-xl px-4 text-lg font-bold text-neutral-600 transition-colors hover:bg-neutral-50"
                >
                  로그아웃
                </button>
              </>
            )}
          </div>
        </nav>
      </div>
    </>
  );
}
