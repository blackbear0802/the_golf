// 시니어 친화 헤더 (로고 + 로그인 상태에 따른 버튼)
"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Header() {
  const { data: session, status } = useSession();
  const isAuthed = status === "authenticated";
  const isLoading = status === "loading";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-warm-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 md:px-8">
        <div className="flex items-center gap-3 md:gap-7">
          <Link href="/" className="flex items-baseline">
            <span className="text-2xl md:text-3xl font-black tracking-tight text-warm-600">
              The Golf
            </span>
          </Link>
          <Link
            href="/packages"
            className="flex h-10 md:h-12 items-center rounded-xl px-2 md:px-3 text-sm md:text-lg font-bold text-neutral-700 transition-colors hover:bg-warm-50 hover:text-warm-600"
          >
            전체상품
          </Link>
        </div>

        <nav className="flex items-center gap-2 md:gap-3">
          {isLoading ? (
            <div className="h-10 w-24 md:h-12 md:w-32" aria-hidden />
          ) : isAuthed ? (
            <>
              <span className="hidden md:inline text-base text-neutral-700">
                <span className="font-bold">{session.user?.name ?? "회원"}</span> 님
              </span>
              {session.user?.role === "admin" && (
                <Link
                  href="/admin"
                  className="flex h-10 md:h-12 items-center rounded-xl bg-neutral-900 px-3 md:px-5 text-sm md:text-lg font-bold text-white transition-colors hover:bg-neutral-800"
                >
                  관리자
                  <span className="hidden md:inline">페이지</span>
                </Link>
              )}
              <Link
                href="/my"
                className="flex h-10 md:h-12 items-center rounded-xl bg-warm-500 px-3 md:px-5 text-sm md:text-lg font-bold text-white transition-colors hover:bg-warm-600"
              >
                마이페이지
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="hidden md:flex h-12 items-center rounded-xl border-2 border-neutral-300 px-5 text-lg font-bold text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="flex h-10 md:h-12 items-center rounded-xl border-2 border-warm-500 px-3 md:px-5 text-sm md:text-lg font-bold text-warm-600 transition-colors hover:bg-warm-50"
              >
                로그인
              </Link>
              <Link
                href="/register"
                className="flex h-10 md:h-12 items-center rounded-xl bg-warm-500 px-3 md:px-5 text-sm md:text-lg font-bold text-white transition-colors hover:bg-warm-600"
              >
                회원가입
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
