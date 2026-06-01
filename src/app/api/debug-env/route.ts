// 임시 진단용 — production 함수가 보는 BAND env 상태를 확인. 디버그 종료 후 즉시 삭제.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

function mask(v: string | undefined): { set: boolean; len: number; tail: string } {
  if (!v) return { set: false, len: 0, tail: "" };
  return { set: true, len: v.length, tail: v.length >= 4 ? v.slice(-4) : v };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  return NextResponse.json({
    BAND_CLIENT_ID: mask(process.env.BAND_CLIENT_ID),
    BAND_CLIENT_SECRET: mask(process.env.BAND_CLIENT_SECRET),
    BAND_REDIRECT_URI: {
      set: !!process.env.BAND_REDIRECT_URI,
      value: process.env.BAND_REDIRECT_URI ?? "",
    },
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "",
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "",
    deploymentUrl: process.env.VERCEL_URL ?? "",
    deploymentEnv: process.env.VERCEL_ENV ?? "",
  });
}
