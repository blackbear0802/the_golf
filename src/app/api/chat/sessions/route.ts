// 로그인 사용자의 챗 세션 목록 — 사이드바 히스토리용.
// 제목은 첫 사용자 메시지 앞 30자(없으면 "(빈 대화)").
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_TITLE = 30;
const LIST_LIMIT = 100;

export async function GET() {
  const auth = await getServerSession(authOptions);
  const userId = (auth?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ sessions: [] });
  }

  const sessions = await prisma.chatSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: LIST_LIMIT,
    select: {
      id: true,
      updatedAt: true,
      _count: { select: { messages: true } },
      messages: {
        where: { role: "user" },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { content: true },
      },
    },
  });

  return NextResponse.json({
    sessions: sessions.map((s) => {
      const firstUser = s.messages[0]?.content?.trim() ?? "";
      const title = firstUser
        ? firstUser.length > MAX_TITLE
          ? firstUser.slice(0, MAX_TITLE) + "…"
          : firstUser
        : "(빈 대화)";
      return {
        id: s.id,
        title,
        messageCount: s._count.messages,
        updatedAt: s.updatedAt.toISOString(),
      };
    }),
  });
}
