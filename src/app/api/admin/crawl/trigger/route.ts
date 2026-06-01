// 어드민 수동 크롤 트리거 — 로그인된 admin만 호출 가능, runBandCrawl 결과를 그대로 반환.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runBandCrawl } from "@/lib/band-crawler";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    const result = await runBandCrawl(new Date());

    if ("skipped" in result) {
      const baseReason =
        result.skipped === "disabled"
          ? "크롤링이 비활성 상태입니다. 활성화 후 다시 시도하세요."
          : "밴드 연결이 되어있지 않거나 대상 밴드가 선택되지 않았습니다.";
      const diag = "diag" in result ? result.diag : undefined;
      const reason = diag ? `${baseReason} [${diag}]` : baseReason;
      return NextResponse.json({ ok: false, skipped: result.skipped, reason }, { status: 200 });
    }

    if ("reason" in result && result.reason === "auth_failed") {
      return NextResponse.json(
        {
          ok: false,
          reason: "auth_failed",
          message: `밴드 인증 실패 (status=${result.statusCode}). '밴드 다시 연결' 버튼으로 재인증 해주세요.`,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
