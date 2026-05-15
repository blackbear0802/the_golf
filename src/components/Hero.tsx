// 메인 히어로 (AI 챗 입력창 + 예시 칩)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EXAMPLE_QUERIES = [
  "치앙마이 4명 골프 투어",
  "10월 일본 3박 골프",
  "비행시간 짧은 동남아",
];

export default function Hero() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function goChat(q: string) {
    const trimmed = q.trim();
    if (!trimmed) {
      router.push("/chat");
      return;
    }
    router.push(`/chat?initial=${encodeURIComponent(trimmed)}`);
  }

  return (
    <section className="bg-gradient-to-b from-warm-50 to-background px-5 py-14 md:px-8 md:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl md:text-5xl font-black leading-tight text-neutral-900">
          어디로 골프 치러
          <br className="md:hidden" /> 가실래요?
        </h1>
        <p className="mt-5 text-lg md:text-xl text-neutral-700 leading-relaxed">
          AI가 고객님께 딱 맞는 골프 투어를 찾아드립니다
        </p>

        <form
          className="mt-10"
          onSubmit={(e) => {
            e.preventDefault();
            goChat(query);
          }}
        >
          <div className="flex flex-col gap-3 rounded-2xl border-2 border-warm-300 bg-white p-3 shadow-lg md:flex-row md:p-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="예: 친구 4명과 따뜻한 동남아로"
              className="h-16 flex-1 rounded-xl bg-transparent px-4 text-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
            />
            <button
              type="submit"
              className="h-16 rounded-xl bg-warm-500 px-8 text-xl font-black text-white transition-colors hover:bg-warm-600"
            >
              찾아보기
            </button>
          </div>
        </form>

        <div className="mt-6 flex flex-wrap justify-center gap-2 md:gap-3">
          {EXAMPLE_QUERIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => goChat(q)}
              className="rounded-full border-2 border-warm-200 bg-white px-4 py-2.5 text-base font-medium text-neutral-700 transition-colors hover:border-warm-400 hover:bg-warm-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
