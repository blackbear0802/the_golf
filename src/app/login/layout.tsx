// 로그인 페이지 메타데이터 — 클라이언트 컴포넌트의 page.tsx에서 분리.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로그인",
  description: "더 골프 회원이라면 로그인 후 예약 내역을 확인하세요.",
  alternates: { canonical: "/login" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
