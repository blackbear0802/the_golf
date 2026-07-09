// 어드민 회원 관리 API (역할 변경 PATCH / 소프트 삭제·복구 DELETE)
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ALLOWED_ROLES = ["user", "admin"] as const;
type Role = (typeof ALLOWED_ROLES)[number];

// 역할 변경 (user ↔ admin)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  const { role } = await req.json();
  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "잘못된 역할값입니다." }, { status: 400 });
  }

  // 본인 계정을 스스로 강등하는 것 방지 (관리자 잠금 방지).
  if (id === session.user.id && role !== "admin") {
    return NextResponse.json(
      { error: "본인 계정의 관리자 권한은 해제할 수 없습니다." },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role: role as Role },
  });

  return NextResponse.json({ id: updated.id, role: updated.role });
}

// 소프트 삭제(탈퇴) / 복구. body { restore: true } 이면 복구.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const restore = body?.restore === true;

  // 본인 계정 삭제 방지.
  if (id === session.user.id && !restore) {
    return NextResponse.json(
      { error: "본인 계정은 삭제할 수 없습니다." },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { deletedAt: restore ? null : new Date() },
  });

  return NextResponse.json({ id: updated.id, deleted: !!updated.deletedAt });
}
