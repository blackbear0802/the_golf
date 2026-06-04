// AI 챗 API — NDJSON 스트림 응답. tool call round-trip + DB 영속(로그인 사용자).
// 성공: 200 text/plain, 줄 단위 JSON
//   {type:"delta",text:string}
//   {type:"done",products:RecommendedProduct[],link:CatalogLink|null,sessionId:string|null}
//   {type:"error",message:string}
// 실패(검증/rate-limit): 4xx application/json {error:string}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { buildChatSystemPrompt } from "@/lib/chat-prompts";
import {
  SEARCH_PRODUCTS_TOOL,
  BROWSE_CATALOG_TOOL,
  executeSearchProducts,
  buildCatalogLink,
  type RecommendedProduct,
  type CatalogLink,
} from "@/lib/chat-tools";
import { checkRateLimit, getClientIp } from "@/lib/chat-rate-limit";
import { prisma } from "@/lib/db";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 1024;
const MAX_USER_TURNS = 20;

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

function jsonErr(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request) {
  // 1) Rate limit
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return jsonErr(
      { error: `이용량이 많아 잠시 후 다시 시도해주세요. (약 ${Math.ceil(rl.retryAfterSec / 60)}분 후)` },
      429
    );
  }

  // 2) 입력 검증
  let body: { messages?: unknown; sessionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonErr({ error: "잘못된 요청 형식입니다." }, 400);
  }

  const messages = sanitizeMessages(body.messages);
  if (!messages) {
    return jsonErr({ error: "메시지가 비어있거나 형식이 잘못되었습니다." }, 400);
  }
  if (messages.filter((m) => m.role === "user").length > MAX_USER_TURNS) {
    return jsonErr({ error: "대화가 너무 길어졌어요. '새 대화'로 다시 시작해주세요." }, 400);
  }

  // 3) DB 세션 처리 (로그인 사용자만)
  const authSession = await getServerSession(authOptions);
  const userId = (authSession?.user as { id?: string } | undefined)?.id ?? null;
  const incomingSessionId = typeof body.sessionId === "string" ? body.sessionId : null;

  let dbSessionId: string | null = null;
  if (userId) {
    if (incomingSessionId) {
      const existing = await prisma.chatSession.findFirst({
        where: { id: incomingSessionId, userId },
        select: { id: true },
      });
      if (existing) dbSessionId = existing.id;
    }
    if (!dbSessionId) {
      const created = await prisma.chatSession.create({ data: { userId } });
      dbSessionId = created.id;
    }
    await prisma.chatMessage.create({
      data: {
        sessionId: dbSessionId,
        role: "user",
        content: messages[messages.length - 1].content,
      },
    });
  }

  // 4) NDJSON 스트림 시작
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const write = async (obj: object) => {
    await writer.write(encoder.encode(JSON.stringify(obj) + "\n"));
  };

  void (async () => {
    try {
      const client = getClient();
      const tools = [SEARCH_PRODUCTS_TOOL, BROWSE_CATALOG_TOOL];
      const systemPrompt = buildChatSystemPrompt(new Date());

      // 첫 번째 호출: tool_use 감지(비스트리밍으로 빠르게).
      // 휴리스틱: 사용자 마지막 메시지에 명시적 검색 신호(국가/시기/박수/예산/인원)가 있으면
      // tool_choice="any"로 도구 호출을 강제. 그렇지 않으면 모델이 자유롭게 판단.
      const lastUserText = messages[messages.length - 1].content;
      const forceTool = hasSearchSignal(lastUserText);

      const first = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        tools,
        ...(forceTool ? { tool_choice: { type: "any" as const } } : {}),
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });

      const toolUseBlock = first.content.find((b) => b.type === "tool_use");
      let recommendedProducts: RecommendedProduct[] = [];
      let catalogLink: CatalogLink | null = null;
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

        // 두 번째 호출: 스트리밍
        const stream = client.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          tools,
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "assistant" as const, content: first.content },
            {
              role: "user" as const,
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

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const chunk = event.delta.text;
            finalText += chunk;
            await write({ type: "delta", text: chunk });
          }
        }
      } else {
        // tool_use 없음: 첫 번째 호출 텍스트를 단일 청크로 전송
        finalText =
          extractText(first.content).trim() ||
          "죄송합니다, 다시 한 번 말씀해주시겠어요?";
        await write({ type: "delta", text: finalText });
      }

      const responseText =
        finalText.trim() || "죄송합니다, 다시 한 번 말씀해주시겠어요?";

      await write({
        type: "done",
        products: recommendedProducts,
        link: catalogLink,
        sessionId: dbSessionId,
      });

      // assistant 메시지 DB 저장 — 추천 상품·링크도 같이 (히스토리에서 카드 복원용).
      if (userId && dbSessionId) {
        await Promise.all([
          prisma.chatMessage.create({
            data: {
              sessionId: dbSessionId,
              role: "assistant",
              content: responseText,
              recommendedProducts:
                recommendedProducts.length > 0 ? recommendedProducts : undefined,
              catalogLink: catalogLink ?? undefined,
            },
          }),
          prisma.chatSession.update({
            where: { id: dbSessionId },
            data: { updatedAt: new Date() },
          }),
        ]);
      }
    } catch (err) {
      console.error("[chat]", err instanceof Error ? err.message : String(err));
      await write({
        type: "error",
        message: "응답을 만들지 못했어요. 잠시 후 다시 시도해주세요.",
      });
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Accel-Buffering": "no",
      "Cache-Control": "no-cache, no-transform",
    },
  });
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
    if (content.length > 4000) return null;
    out.push({ role, content: content.slice(0, 4000) });
  }
  if (out[out.length - 1].role !== "user") return null;
  return out;
}

// 사용자 메시지에 명시적 상품 검색 신호가 있는지. 있으면 첫 호출에서 tool_choice=any로 강제.
// 휴리스틱이 보수적으로 동작해 false negative(되묻기)를 줄이는 게 목표.
function hasSearchSignal(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  // 국가/지역 키워드(regions.ts와 일치하는 국가명 + 흔한 지역 별칭)
  const PLACE = /(중국|베트남|태국|일본|필리핀|말레이시아|다낭|호치민|푸꾸옥|나트랑|후쿠오카|오키나와|구마모토|사가|도쿄|오사카|치앙마이|방콕|파타야|시랏차|클라크|세부|코타키나발루|쿠알라룸푸르|상하이|베이징|웨이하이|쑤첸|염성|허페이|합비)/;
  // 시기(N월, 다음/이번 달, YYYY-MM 포함)
  const WHEN = /(\d{1,2}\s*월|다음\s*달|이번\s*달|올여름|올겨울|내년|\d{4}[-/.]\d{1,2})/;
  // 박수·예산·인원
  const NIGHTS = /\d+\s*박/;
  const BUDGET = /(예산|\d+\s*만\s*원|\d+\s*만원|\d{1,3}(?:,\d{3})+\s*원)/;
  const HEAD = /\d+\s*명/;
  // 전체 둘러보기 신호 — browse_catalog 강제용
  const BROWSE = /(전체\s*상품|다\s*보여|모두|뭐\s*있|어떤\s*상품)/;
  return (
    PLACE.test(t) ||
    WHEN.test(t) ||
    NIGHTS.test(t) ||
    BUDGET.test(t) ||
    HEAD.test(t) ||
    BROWSE.test(t)
  );
}

function extractText(content: Anthropic.Messages.Message["content"]): string {
  return content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}
