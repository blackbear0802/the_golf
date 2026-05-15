// 밴드 OAuth 시작 — authorize URL로 302 리다이렉트.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildAuthorizeUrl } from "@/lib/band-oauth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const clientId = process.env.BAND_CLIENT_ID;
  const redirectUri = process.env.BAND_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "BAND_CLIENT_ID 또는 BAND_REDIRECT_URI가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const url = buildAuthorizeUrl({ clientId, redirectUri });
  return NextResponse.redirect(url);
}
