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
  bandNidAut?: string;
  bandNidSes?: string;
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

  // 쿠키는 입력값이 있을 때만 갱신 (빈 문자열은 기존 유지)
  if (typeof body.bandNidAut === "string" && body.bandNidAut.trim()) {
    updates[APP_CONFIG_KEYS.bandNidAut] = body.bandNidAut.trim();
  }
  if (typeof body.bandNidSes === "string" && body.bandNidSes.trim()) {
    updates[APP_CONFIG_KEYS.bandNidSes] = body.bandNidSes.trim();
  }

  if (typeof body.crawlEnabled === "boolean") {
    updates[APP_CONFIG_KEYS.crawlEnabled] = body.crawlEnabled ? "true" : "false";
  }

  // 쿠키가 갱신되면 만료 플래그 해제
  if (updates[APP_CONFIG_KEYS.bandNidAut] || updates[APP_CONFIG_KEYS.bandNidSes]) {
    updates[APP_CONFIG_KEYS.cookieExpiredAt] = "";
  }

  await setConfigMany(updates);

  return NextResponse.json({ ok: true, updated: Object.keys(updates) });
}
