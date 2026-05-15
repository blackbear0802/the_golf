// 회원가입 페이지 메타데이터 — 클라이언트 컴포넌트의 page.tsx에서 분리.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "회원가입",
  description: "더 골프 회원가입. 가입 후 예약 진행과 내역 조회가 가능합니다.",
  alternates: { canonical: "/register" },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
