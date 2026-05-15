// 밴드 OAuth 콜백 — code를 토큰으로 교환해 AppConfig에 저장 후 /admin/settings로 복귀.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { exchangeCodeForToken, BandOAuthError } from "@/lib/band-oauth";
import { APP_CONFIG_KEYS, setConfigMany, type AppConfigKey } from "@/lib/app-config";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const errParam = url.searchParams.get("error");
  if (errParam) {
    return redirectWithError(url.origin, `밴드 동의 실패: ${errParam}`);
  }
  if (!code) {
    return redirectWithError(url.origin, "code 파라미터가 없습니다.");
  }

  const clientId = process.env.BAND_CLIENT_ID;
  const clientSecret = process.env.BAND_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirectWithError(url.origin, "BAND_CLIENT_ID/SECRET 환경변수가 비어있습니다.");
  }

  try {
    const token = await exchangeCodeForToken({ clientId, clientSecret, code });

    const updates: Partial<Record<AppConfigKey, string>> = {
      [APP_CONFIG_KEYS.bandAccessToken]: token.access_token,
      [APP_CONFIG_KEYS.bandConnectedAt]: new Date().toISOString(),
      [APP_CONFIG_KEYS.cookieExpiredAt]: "", // 구버전 만료 마커 클리어
    };
    if (token.refresh_token) updates[APP_CONFIG_KEYS.bandRefreshToken] = token.refresh_token;
    if (typeof token.expires_in === "number") {
      const exp = new Date(Date.now() + token.expires_in * 1000).toISOString();
      updates[APP_CONFIG_KEYS.bandTokenExpiresAt] = exp;
    } else {
      updates[APP_CONFIG_KEYS.bandTokenExpiresAt] = "";
    }
    await setConfigMany(updates);

    return NextResponse.redirect(`${url.origin}/admin/settings?band=connected`);
  } catch (err) {
    const msg =
      err instanceof BandOAuthError
        ? `토큰 교환 실패 (status=${err.statusCode}): ${err.body.slice(0, 200)}`
        : err instanceof Error
          ? err.message
          : String(err);
    return redirectWithError(url.origin, msg);
  }
}

function redirectWithError(origin: string, message: string) {
  const q = new URLSearchParams({ band: "error", reason: message.slice(0, 300) });
  return NextResponse.redirect(`${origin}/admin/settings?${q.toString()}`);
}
