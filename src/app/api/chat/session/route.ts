// 로그인 사용자 최근 챗 세션 복원 API (구버전 자동 복원 경로 — 새 UI는 /api/chat/sessions 사용).
// 호환을 위해 GET은 남겨두지만 클라이언트는 더 이상 자동 호출하지 않는다.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_RESTORE = 40;

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
