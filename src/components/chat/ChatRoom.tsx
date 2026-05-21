// AI 챗 대화창 — 메시지 리스트, 입력, sessionStorage로 대화 영속(로그인 우회 후 복귀 시 이어가기)
"use client";

import { useEffect, useRef, useState } from "react";
import ChatMessage, { type Message } from "./ChatMessage";

const STORAGE_KEY = "thegolf.chat.messages";

type Props = { initial: string };

export default function ChatRoom({ initial }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const sessionIdRef = useRef<string>("");
  const initialSentRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 마운트: 세션 ID 생성 + sessionStorage에서 대화 복원
  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    if (typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Message[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            // 복원된 대화가 있으면 initial 자동 전송은 막는다
            initialSentRef.current = true;
          }
        }
      } catch {
        // 손상된 JSON은 무시
      }
    }
    setHydrated(true);
  }, []);

  // messages 바뀔 때마다 sessionStorage에 sync
  useEffect(() => {
    if (!hydrated) return;
    if (typeof window === "undefined") return;
    try {
      if (messages.length === 0) {
        sessionStorage.removeItem(STORAGE_KEY);
      } else {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      }
    } catch {
      // quota 초과 등은 무시 (대화 영속이 핵심 기능은 아님)
    }
  }, [messages, hydrated]);

  // initial query 자동 전송 (hydration 끝나고 한 번만, 복원된 대화 없을 때)
  useEffect(() => {
    if (!hydrated) return;
    if (initialSentRef.current) return;
    if (!initial.trim()) {
      initialSentRef.current = true;
      return;
    }
    initialSentRef.current = true;
    void send(initial.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, initial]);

  // 스크롤을 항상 가장 아래로
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  // 입력창에 항상 포커스 유지
  useEffect(() => {
    if (loading) return;
    inputRef.current?.focus();
  }, [loading, messages.length]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError("");
    const next: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          sessionId: sessionIdRef.current,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "응답을 만들지 못했어요.");
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.content,
          recommendedProducts: data.recommendedProducts ?? [],
          link: data.link ?? null,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  }

  function newConversation() {
    setMessages([]);
    setInput("");
    setError("");
    initialSentRef.current = true; // 새 대화에서는 자동 전송 안 함
  }

  return (
    <div className="mx-auto flex h-[calc(100svh-5rem)] max-w-3xl flex-col px-4 md:px-6">
      <div className="flex items-center justify-between py-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-neutral-900">AI 골프 투어 상담</h1>
          <p className="text-sm text-neutral-500">자연어로 원하시는 조건을 말씀해주세요</p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={newConversation}
            className="rounded-xl border-2 border-neutral-200 px-4 py-2 text-sm font-bold text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            새 대화
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-4 md:p-6"
      >
        {messages.length === 0 ? (
          <EmptyState onPick={(q) => send(q)} />
        ) : (
          <ul className="space-y-4">
            {messages.map((m, i) => (
              <li key={i}>
                <ChatMessage message={m} />
              </li>
            ))}
            {loading && (
              <li>
                <TypingIndicator />
              </li>
            )}
          </ul>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">
          {error}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex gap-2 pb-4"
      >
        <input
          ref={inputRef}
          type="text"
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="원하시는 조건을 자유롭게 말씀해주세요"
          disabled={loading}
          className="h-14 flex-1 rounded-xl border-2 border-neutral-200 bg-white px-4 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-warm-500 focus:outline-none disabled:bg-neutral-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="h-14 rounded-xl bg-warm-500 px-6 text-base font-black text-white transition-colors hover:bg-warm-600 disabled:bg-neutral-300"
        >
          전송
        </button>
      </form>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 text-neutral-400">
      <span className="text-sm">상담원이 입력 중</span>
      <span className="inline-flex gap-0.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400" />
      </span>
    </div>
  );
}

const EXAMPLES = [
  "친구 4명이서 11월 다낭 4박 골프",
  "150만원 이하 동남아 3박",
  "10월 후쿠오카 부부 2명",
];

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center py-12 text-center">
      <div className="text-5xl">🏌️</div>
      <p className="mt-4 text-lg font-bold text-neutral-800">
        어떤 골프 투어를 찾으세요?
      </p>
      <p className="mt-2 text-sm text-neutral-500">
        목적지·기간·예산·인원·시기를 자연스럽게 말씀해주시면 추천해드려요
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            className="rounded-full border-2 border-warm-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:border-warm-400 hover:bg-warm-50"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
