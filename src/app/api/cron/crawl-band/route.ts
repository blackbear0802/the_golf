// Vercel Cron 진입점 — runBandCrawl()을 CRON_SECRET 검증 후 호출.
// 비즈니스 로직은 src/lib/band-crawler.ts 에 위치한다.

import { NextResponse } from "next/server";
import { runBandCrawl } from "@/lib/band-crawler";

export const maxDuration = 300; // Vercel Pro 한도, 5분
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runBandCrawl(new Date());

    // 성공 응답에도 skipped(개수: number)가 들어있어서 문자열 분기만 skip 사유로 처리.
    if ("skipped" in result && typeof result.skipped === "string") {
      if (result.skipped === "missing_credentials") {
        return NextResponse.json({ error: "missing_credentials" }, { status: 400 });
      }
      return NextResponse.json({ skipped: result.skipped });
    }

    if ("reason" in result && result.reason === "auth_failed") {
      return NextResponse.json(
        { error: "auth_failed", status: result.statusCode },
        { status: 401 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
