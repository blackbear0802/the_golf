// NextAuth SessionProvider 클라이언트 래퍼 (서버 컴포넌트 layout에서 사용)
"use client";

import { SessionProvider } from "next-auth/react";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
