// 내 프로필 수정 API (이름/연락처) — 본인 세션만 허용
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validatePhone } from "@/lib/validators";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { name, phone } = await req.json();

  const trimmedName = typeof name === "string" ? name.trim() : "";
  if (!trimmedName) {
    return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
  }
  if (trimmedName.length > 50) {
    return NextResponse.json({ error: "이름은 50자 이내로 입력해주세요." }, { status: 400 });
  }

  const phoneError = validatePhone(phone);
  if (phoneError) {
    return NextResponse.json({ error: phoneError }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { name: trimmedName, phone },
    select: { id: true, name: true, phone: true },
  });

  return NextResponse.json(updated);
}
