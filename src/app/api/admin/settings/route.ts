// 어드민 시스템 설정 저장 API — 담당자 연락처, 밴드 쿠키, 크롤링 활성화
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { APP_CONFIG_KEYS, setConfigMany, type AppConfigKey } from "@/lib/app-config";
import { validatePhone, validateEmail } from "@/lib/validators";

type SettingsPayload = {
  operatorName?: string;
  operatorPhone?: string;
  operatorEmail?: string;
  bandId?: string;
  bandCookies?: string;
  crawlEnabled?: boolean;
};

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = (await req.json()) as SettingsPayload;
  const updates: Partial<Record<AppConfigKey, string>> = {};

  if (typeof body.operatorName === "string") {
    const v = body.operatorName.trim();
    if (!v) {
      return NextResponse.json({ error: "담당자 이름을 입력해주세요." }, { status: 400 });
    }
    updates[APP_CONFIG_KEYS.operatorName] = v;
  }

  if (typeof body.operatorPhone === "string") {
    const v = body.operatorPhone.trim();
    const err = validatePhone(v);
    if (err) return NextResponse.json({ error: `담당자 연락처: ${err}` }, { status: 400 });
    updates[APP_CONFIG_KEYS.operatorPhone] = v;
  }

  if (typeof body.operatorEmail === "string") {
    const v = body.operatorEmail.trim();
    const err = validateEmail(v);
    if (err) return NextResponse.json({ error: `담당자 이메일: ${err}` }, { status: 400 });
    updates[APP_CONFIG_KEYS.operatorEmail] = v;
  }

  if (typeof body.bandId === "string") {
    const v = body.bandId.trim();
    updates[APP_CONFIG_KEYS.bandId] = v;
  }

  // 쿠키 헤더는 입력값이 있을 때만 갱신 (빈 문자열은 기존 유지)
  if (typeof body.bandCookies === "string" && body.bandCookies.trim()) {
    updates[APP_CONFIG_KEYS.bandCookies] = body.bandCookies.trim();
    // 새 쿠키 입력 시 만료 플래그 해제
    updates[APP_CONFIG_KEYS.cookieExpiredAt] = "";
  }

  if (typeof body.crawlEnabled === "boolean") {
    updates[APP_CONFIG_KEYS.crawlEnabled] = body.crawlEnabled ? "true" : "false";
  }

  await setConfigMany(updates);

  return NextResponse.json({ ok: true, updated: Object.keys(updates) });
}
