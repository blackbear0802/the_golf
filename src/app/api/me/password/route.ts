// 내 비밀번호 변경 API — 현재 비밀번호 확인 후 새 비밀번호로 교체
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validatePassword } from "@/lib/validators";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword) {
    return NextResponse.json(
      { error: "현재 비밀번호를 입력해주세요." },
      { status: 400 }
    );
  }

  const newError = validatePassword(newPassword);
  if (newError) {
    return NextResponse.json({ error: newError }, { status: 400 });
  }

  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "새 비밀번호는 현재 비밀번호와 달라야 합니다." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash) {
    return NextResponse.json(
      { error: "비밀번호가 설정되어 있지 않은 계정입니다." },
      { status: 400 }
    );
  }

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { error: "현재 비밀번호가 일치하지 않습니다." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true });
}
