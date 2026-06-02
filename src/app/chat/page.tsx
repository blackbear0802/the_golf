// AI 챗 페이지 — 사이드바 히스토리 + ChatRoom. /chat?initial=<query> 로 진입 시 새 챗 + 자동 첫 메시지.
import type { Metadata } from "next";
import Header from "@/components/Header";
import ChatLayout from "@/components/chat/ChatLayout";

export const metadata: Metadata = {
  title: "AI 상담",
  description: "원하시는 조건을 자연어로 말씀해주시면 AI가 딱 맞는 골프 투어를 찾아드립니다.",
  alternates: { canonical: "/chat" },
};

export default async function ChatPage({
  searchParams,
}: {
  searchParams?: Promise<{ initial?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const initial = typeof params.initial === "string" ? params.initial.slice(0, 500) : "";

  return (
    <>
      <Header />
      <main className="flex-1">
        <ChatLayout initial={initial} />
      </main>
    </>
  );
}
