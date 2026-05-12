// 회원가입 API (이메일/비밀번호 + 이름/연락처)
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import {
  validateEmail,
  validatePhone,
  validatePassword,
} from "@/lib/validators";

export async function POST(req: Request) {
  const { name, email, phone, password } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
  }

  const emailError = validateEmail(email);
  if (emailError) return NextResponse.json({ error: emailError }, { status: 400 });

  const phoneError = validatePhone(phone);
  if (phoneError) return NextResponse.json({ error: phoneError }, { status: 400 });

  const passwordError = validatePassword(password);
  if (passwordError)
    return NextResponse.json({ error: passwordError }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "이미 가입된 이메일입니다." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash,
      signupCompleted: true,
    },
  });

  return NextResponse.json({ id: user.id, email: user.email });
}
