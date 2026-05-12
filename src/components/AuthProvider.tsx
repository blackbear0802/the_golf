// NextAuth SessionProvider 클라이언트 래퍼 (서버 컴포넌트 layout에서 초기 session 주입)
"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

export default function AuthProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
