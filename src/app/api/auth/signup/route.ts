// 회원가입 API (필수: 이메일/비밀번호/이름/연락처/약관동의, 선택: 생년월일·성별·구력·핸디캡·지역)
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import {
  validateEmail,
  validatePhone,
  validatePassword,
  validateBirthDate,
} from "@/lib/validators";
import {
  isGender,
  isGolfCareer,
  isHandicap,
  isRegion,
  type GenderValue,
} from "@/lib/signup-options";

export async function POST(req: Request) {
  const {
    name,
    email,
    phone,
    password,
    birthDate,
    gender,
    golfCareer,
    handicap,
    region,
    agreeTerms,
    agreePrivacy,
    agreeMarketing,
  } = await req.json();

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

  if (!agreeTerms || !agreePrivacy) {
    return NextResponse.json(
      { error: "필수 약관에 동의해주세요." },
      { status: 400 }
    );
  }

  const birthDateError = validateBirthDate(birthDate ?? "");
  if (birthDateError)
    return NextResponse.json({ error: birthDateError }, { status: 400 });

  // 선택 셀렉트 값은 제공된 경우에만 허용 목록 멤버십을 검증한다.
  if (gender && !isGender(gender))
    return NextResponse.json({ error: "성별 값이 올바르지 않습니다." }, { status: 400 });
  if (golfCareer && !isGolfCareer(golfCareer))
    return NextResponse.json({ error: "구력 값이 올바르지 않습니다." }, { status: 400 });
  if (handicap && !isHandicap(handicap))
    return NextResponse.json({ error: "핸디캡 값이 올바르지 않습니다." }, { status: 400 });
  if (region && !isRegion(region))
    return NextResponse.json({ error: "거주 지역 값이 올바르지 않습니다." }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "이미 가입된 이메일입니다." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash,
      signupCompleted: true,
      birthDate: birthDate ? new Date(`${birthDate}T00:00:00Z`) : null,
      gender: gender ? (gender as GenderValue) : null,
      golfCareer: golfCareer || null,
      handicap: handicap || null,
      region: region || null,
      termsAgreedAt: now,
      privacyAgreedAt: now,
      marketingAgreedAt: agreeMarketing ? now : null,
    },
  });

  return NextResponse.json({ id: user.id, email: user.email });
}
