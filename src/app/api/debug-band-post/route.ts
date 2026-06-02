// 임시 진단용 — BAND 게시글 detail의 raw JSON을 그대로 노출. 응답 구조 확인 후 즉시 삭제.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { APP_CONFIG_KEYS, getConfigMany } from "@/lib/app-config";

export const dynamic = "force-dynamic";

const API_BASE = "https://openapi.band.us";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const cfg = await getConfigMany([
    APP_CONFIG_KEYS.bandAccessToken,
    APP_CONFIG_KEYS.bandKey,
  ]);
  if (!cfg.bandAccessToken || !cfg.bandKey) {
    return NextResponse.json({ error: "BAND 미연결" }, { status: 400 });
  }

  // ?postKey=xxx 로 특정 게시글 지정. 안 주면 첫 게시글로.
  const url = new URL(req.url);
  let postKey = url.searchParams.get("postKey");

  if (!postKey) {
    const listRes = await fetch(
      `${API_BASE}/v2/band/posts?access_token=${cfg.bandAccessToken}&band_key=${cfg.bandKey}&locale=ko-KR`
    );
    const listJson = (await listRes.json()) as {
      result_data?: { items?: { post_key?: string }[] };
    };
    postKey = listJson.result_data?.items?.[0]?.post_key ?? null;
    if (!postKey) {
      return NextResponse.json({ error: "게시글 없음", listJson });
    }
  }

  const detailRes = await fetch(
    `${API_BASE}/v2.1/band/post?access_token=${cfg.bandAccessToken}&band_key=${cfg.bandKey}&post_key=${postKey}`
  );
  const detailJson = await detailRes.json();
  return NextResponse.json({ postKey, raw: detailJson });
}
