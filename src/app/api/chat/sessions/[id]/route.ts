// 특정 챗 세션의 메시지 로드(GET) + 세션 삭제(DELETE). 본인 세션만 접근 가능.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_RESTORE = 200;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await getServerSession(authOptions);
  const userId = (auth?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }
  const session = await prisma.chatSession.findFirst({
    where: { id, userId },
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: MAX_RESTORE },
    },
  });
  if (!session) {
    return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({
    sessionId: session.id,
    messages: session.messages.map((m) => ({ role: m.role, content: m.content })),
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await getServerSession(authOptions);
  const userId = (auth?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }
  // 본인 세션만 삭제 — userId 조건으로 결과 0이면 다른 사람 세션 시도이므로 404.
  const res = await prisma.chatSession.deleteMany({ where: { id, userId } });
  if (res.count === 0) {
    return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
