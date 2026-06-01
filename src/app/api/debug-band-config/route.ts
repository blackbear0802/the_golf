// 임시 진단용 — AppConfig에 저장된 BAND 관련 키 상태 확인. 디버그 종료 후 즉시 삭제.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { APP_CONFIG_KEYS, getConfigMany } from "@/lib/app-config";

export const dynamic = "force-dynamic";

function mask(v: string | null | undefined): { set: boolean; len: number; tail: string } {
  if (!v) return { set: false, len: 0, tail: "" };
  return { set: true, len: v.length, tail: v.length >= 4 ? v.slice(-4) : v };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const cfg = await getConfigMany([
    APP_CONFIG_KEYS.crawlEnabled,
    APP_CONFIG_KEYS.bandKey,
    APP_CONFIG_KEYS.bandAccessToken,
    APP_CONFIG_KEYS.bandRefreshToken,
    APP_CONFIG_KEYS.bandTokenExpiresAt,
    APP_CONFIG_KEYS.bandConnectedAt,
  ]);
  return NextResponse.json({
    crawlEnabled: cfg.crawlEnabled,
    bandKey: mask(cfg.bandKey),
    bandKey_raw_first8: cfg.bandKey ? cfg.bandKey.slice(0, 8) : "",
    bandAccessToken: mask(cfg.bandAccessToken),
    bandRefreshToken: mask(cfg.bandRefreshToken),
    bandTokenExpiresAt: cfg.bandTokenExpiresAt,
    bandConnectedAt: cfg.bandConnectedAt,
  });
}
