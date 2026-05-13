// 어드민 권한 체크 (서버 컴포넌트/API에서 호출, 미인증·비admin은 notFound로 처리)
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    notFound();
  }
  return session;
}
