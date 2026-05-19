// 클라이언트 Blob 직행 업로드 토큰 브로커 (어드민 전용) — Vercel 4.5MB 함수 한도 회피
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = (await req.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        addRandomSuffix: true,
      }),
      // 업로드 완료 콜백(Vercel webhook). 로컬에선 호출 안 됨 — URL은 클라이언트가 직접 받음.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "업로드 토큰 발급 실패" },
      { status: 400 }
    );
  }
}
