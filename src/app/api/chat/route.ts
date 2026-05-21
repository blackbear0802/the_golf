// AI 챗 API — Anthropic Haiku 4.5 + search_products tool 1회 round-trip.
// 입력: { messages: [{role, content}], sessionId }
// 출력: { content, recommendedProducts? }

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { CHAT_SYSTEM_PROMPT } from "@/lib/chat-prompts";
import {
  SEARCH_PRODUCTS_TOOL,
  BROWSE_CATALOG_TOOL,
  executeSearchProducts,
  buildCatalogLink,
  type RecommendedProduct,
  type CatalogLink,
} from "@/lib/chat-tools";
import { checkRateLimit, getClientIp } from "@/lib/chat-rate-limit";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 1024;
const MAX_USER_TURNS = 20; // 한 세션에 너무 많이 누적되면 비용·속도 저하

type ChatRole = "user" | "assistant";
type ClientMessage = { role: ChatRole; content: string };

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.");
  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

export async function POST(req: Request) {
  // 1) Rate limit
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `이용량이 많아 잠시 후 다시 시도해주세요. (약 ${Math.ceil(rl.retryAfterSec / 60)}분 후)` },
      { status: 429 }
    );
  }

  // 2) 입력 검증
  let body: { messages?: unknown; sessionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const messages = sanitizeMessages(body.messages);
  if (!messages) {
    return NextResponse.json({ error: "메시지가 비어있거나 형식이 잘못되었습니다." }, { status: 400 });
  }
  if (messages.filter((m) => m.role === "user").length > MAX_USER_TURNS) {
    return NextResponse.json(
      { error: "대화가 너무 길어졌어요. '새 대화'로 다시 시작해주세요." },
      { status: 400 }
    );
  }

  // 3) Anthropic 호출
  try {
    const client = getClient();
    const tools = [SEARCH_PRODUCTS_TOOL, BROWSE_CATALOG_TOOL];
    const first = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: CHAT_SYSTEM_PROMPT,
      tools,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    // 4) Tool 호출 분기
    const toolUseBlock = first.content.find((b) => b.type === "tool_use");
    let recommendedProducts: RecommendedProduct[] | undefined;
    let catalogLink: CatalogLink | undefined;
    let finalText = "";

    if (toolUseBlock && toolUseBlock.type === "tool_use") {
      let toolResultContent: string;

      if (toolUseBlock.name === "search_products") {
        const args = (toolUseBlock.input ?? {}) as Parameters<typeof executeSearchProducts>[0];
        const result = await executeSearchProducts(args);
        recommendedProducts = result.products;
        toolResultContent = JSON.stringify(result);
      } else if (toolUseBlock.name === "browse_catalog") {
        const args = (toolUseBlock.input ?? {}) as { destination?: string; month?: string };
        catalogLink = buildCatalogLink(args);
        toolResultContent = JSON.stringify({ link: catalogLink });
      } else {
        toolResultContent = JSON.stringify({ error: "알 수 없는 도구" });
      }

      // tool_result를 messages에 append 후 한 번 더 호출
      const second = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: CHAT_SYSTEM_PROMPT,
        tools,
        messages: [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: "assistant", content: first.content },
          {
            role: "user",
            content: [
              {
                type: "tool_result" as const,
                tool_use_id: toolUseBlock.id,
                content: toolResultContent,
              },
            ],
          },
        ],
      });

      finalText = extractText(second.content);
    } else {
      finalText = extractText(first.content);
    }

    return NextResponse.json({
      content: finalText.trim() || "죄송합니다, 다시 한 번 말씀해주시겠어요?",
      recommendedProducts: recommendedProducts ?? [],
      link: catalogLink ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[chat]", msg);
    return NextResponse.json(
      { error: "응답을 만들지 못했어요. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}

function sanitizeMessages(raw: unknown): ClientMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: ClientMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") return null;
    const obj = m as Record<string, unknown>;
    const role = obj.role;
    const content = obj.content;
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string" || !content.trim()) return null;
    if (content.length > 4000) return null; // 한 메시지 4KB 가드
    out.push({ role, content: content.slice(0, 4000) });
  }
  // 마지막은 user여야 함
  if (out[out.length - 1].role !== "user") return null;
  return out;
}

function extractText(content: Anthropic.Messages.Message["content"]): string {
  return content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}
