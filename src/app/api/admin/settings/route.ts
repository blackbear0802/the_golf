// 어드민 시스템 설정 저장 API — 담당자 2명 + 밴드 쿠키 + 크롤링 활성화
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { APP_CONFIG_KEYS, setConfigMany, type AppConfigKey } from "@/lib/app-config";
import { validatePhone, validateEmail } from "@/lib/validators";

type OperatorInput = {
  name?: string;
  phone?: string;
  email?: string;
};

type SettingsPayload = {
  operator1?: OperatorInput;
  operator2?: OperatorInput;
  bandId?: string;
  bandCookies?: string;
  crawlEnabled?: boolean;
};

function validateOperator(
  op: OperatorInput | undefined,
  label: string
): { name: string; phone: string; email: string } | { error: string } | null {
  if (!op) return null;
  const name = typeof op.name === "string" ? op.name.trim() : "";
  const phone = typeof op.phone === "string" ? op.phone.trim() : "";
  const email = typeof op.email === "string" ? op.email.trim() : "";

  // 셋 다 비면 "입력하지 않음"으로 간주 (등록 해제 의도)
  if (!name && !phone && !email) {
    return { name: "", phone: "", email: "" };
  }

  if (!name) return { error: `${label} 이름을 입력해주세요.` };
  if (name.length > 50) return { error: `${label} 이름은 50자 이내로 입력해주세요.` };

  const phoneErr = validatePhone(phone);
  if (phoneErr) return { error: `${label} 연락처: ${phoneErr}` };

  const emailErr = validateEmail(email);
  if (emailErr) return { error: `${label} 이메일: ${emailErr}` };

  return { name, phone, email };
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = (await req.json()) as SettingsPayload;
  const updates: Partial<Record<AppConfigKey, string>> = {};

  const op1 = validateOperator(body.operator1, "담당자 1");
  if (op1 && "error" in op1) {
    return NextResponse.json({ error: op1.error }, { status: 400 });
  }
  if (op1) {
    updates[APP_CONFIG_KEYS.operator1Name] = op1.name;
    updates[APP_CONFIG_KEYS.operator1Phone] = op1.phone;
    updates[APP_CONFIG_KEYS.operator1Email] = op1.email;
  }

  const op2 = validateOperator(body.operator2, "담당자 2");
  if (op2 && "error" in op2) {
    return NextResponse.json({ error: op2.error }, { status: 400 });
  }
  if (op2) {
    updates[APP_CONFIG_KEYS.operator2Name] = op2.name;
    updates[APP_CONFIG_KEYS.operator2Phone] = op2.phone;
    updates[APP_CONFIG_KEYS.operator2Email] = op2.email;
  }

  if (typeof body.bandId === "string") {
    updates[APP_CONFIG_KEYS.bandId] = body.bandId.trim();
  }

  if (typeof body.bandCookies === "string" && body.bandCookies.trim()) {
    updates[APP_CONFIG_KEYS.bandCookies] = body.bandCookies.trim();
    updates[APP_CONFIG_KEYS.cookieExpiredAt] = "";
  }

  if (typeof body.crawlEnabled === "boolean") {
    updates[APP_CONFIG_KEYS.crawlEnabled] = body.crawlEnabled ? "true" : "false";
  }

  await setConfigMany(updates);

  return NextResponse.json({ ok: true, updated: Object.keys(updates) });
}
