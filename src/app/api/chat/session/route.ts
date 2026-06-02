// 로그인 사용자 최근 챗 세션 복원 + 로그아웃 시 챗 세션 정리 API
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_RESTORE = 40;

// 로그아웃 직전 클라이언트가 호출 — 사용자의 챗 세션을 모두 삭제(메시지는 cascade로 같이).
// 로그아웃 후 재로그인 시 이전 대화가 자동 복원되지 않도록 하기 위함.
export async function DELETE() {
  const auth = await getServerSession(authOptions);
  const userId = (auth?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ ok: true });
  await prisma.chatSession.deleteMany({ where: { userId } });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const auth = await getServerSession(authOptions);
  const userId = (auth?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    return NextResponse.json({ messages: [], sessionId: null });
  }

  const session = await prisma.chatSession.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: MAX_RESTORE,
      },
    },
  });

  if (!session || session.messages.length === 0) {
    return NextResponse.json({ messages: [], sessionId: null });
  }

  return NextResponse.json({
    sessionId: session.id,
    messages: session.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });
}
