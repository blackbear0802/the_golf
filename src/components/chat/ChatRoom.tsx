// AI 챗 대화창 — NDJSON 스트리밍 수신, 로그인 시 DB 세션 복원
"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import ChatMessage, { type Message } from "./ChatMessage";
import type { RecommendedProduct, CatalogLink } from "@/lib/chat-tools";

const STORAGE_KEY = "thegolf.chat.messages";

type Props = { initial: string };

export default function ChatRoom({ initial }: Props) {
  const { status: authStatus } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const sessionIdRef = useRef<string>("");
  const initialSentRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // sessionStorage 복원 헬퍼
  function restoreFromStorage() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Message[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          initialSentRef.current = true;
        }
      }
    } catch {
      // 손상된 JSON 무시
    }
  }

  // 마운트: authStatus 확정 후 세션 ID 생성 + 대화 복원
  useEffect(() => {
    if (authStatus === "loading") return;

    if (!sessionIdRef.current) {
      sessionIdRef.current =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    if (authStatus === "authenticated") {
      // 로그인: 서버 DB에서 복원 시도, 실패 시 sessionStorage 폴백
      fetch("/api/chat/session")
        .then((r) => r.json())
        .then((data: { messages: { role: string; content: string }[]; sessionId: string | null }) => {
          if (Array.isArray(data.messages) && data.messages.length > 0) {
            setMessages(
              data.messages.map((m): Message =>
                m.role === "user"
                  ? { role: "user", content: m.content }
                  : { role: "assistant", content: m.content }
              )
            );
            if (data.sessionId) sessionIdRef.current = data.sessionId;
            initialSentRef.current = true;
          } else {
            restoreFromStorage();
          }
        })
        .catch(() => restoreFromStorage())
        .finally(() => setHydrated(true));
    } else {
      restoreFromStorage();
      setHydrated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus]);

  // messages 바뀔 때마다 sessionStorage 동기화
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (messages.length === 0) sessionStorage.removeItem(STORAGE_KEY);
      else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // quota 초과 등 무시
    }
  }, [messages, hydrated]);

  // initial query 자동 전송 (hydration 끝, 복원 없을 때 한 번)
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

  // 스크롤 항상 최하단
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  // 입력창 포커스 유지
  useEffect(() => {
    if (loading) return;
    inputRef.current?.focus();
  }, [loading, messages.length]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError("");
    const sendMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(sendMessages);
    setInput("");
    setLoading(true);

    let assistantAdded = false;
    let fullContent = "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: sendMessages.map((m) => ({ role: m.role, content: m.content })),
          sessionId: sessionIdRef.current,
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "응답을 만들지 못했어요.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let event: {
            type: string;
            text?: string;
            products?: RecommendedProduct[];
            link?: CatalogLink | null;
            sessionId?: string | null;
            message?: string;
          };
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }

          if (event.type === "delta" && event.text) {
            fullContent += event.text;
            if (!assistantAdded) {
              assistantAdded = true;
              setMessages((prev) => [
                ...prev,
                { role: "assistant", content: fullContent, recommendedProducts: [], link: null },
              ]);
            } else {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = { ...last, content: fullContent };
                }
                return updated;
              });
            }
          } else if (event.type === "done") {
            if (event.sessionId) sessionIdRef.current = event.sessionId;
            const products = Array.isArray(event.products) ? event.products : [];
            const link = event.link ?? null;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  content: fullContent || "죄송합니다, 다시 한 번 말씀해주시겠어요?",
                  recommendedProducts: products,
                  link,
                };
              }
              return updated;
            });
          } else if (event.type === "error") {
            setError(event.message ?? "응답을 만들지 못했어요.");
            if (assistantAdded) setMessages((prev) => prev.slice(0, -1));
          }
        }
      }

      // 스트림이 끝났는데 응답이 없는 경우
      if (!assistantAdded) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "죄송합니다, 다시 한 번 말씀해주시겠어요?",
            recommendedProducts: [],
            link: null,
          },
        ]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류가 발생했어요.");
      if (assistantAdded) setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  function newConversation() {
    setMessages([]);
    setInput("");
    setError("");
    // 새 UUID로 리셋 → 다음 메시지에서 새 ChatSession 생성
    sessionIdRef.current =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    initialSentRef.current = true;
  }

  const lastIsAssistant =
    messages.length > 0 && messages[messages.length - 1].role === "assistant";

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
            {loading && !lastIsAssistant && (
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
