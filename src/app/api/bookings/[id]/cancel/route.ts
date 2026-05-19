// 사용자 본인 예약 취소 API (확정 전 건만, POST)
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// 사용자가 스스로 취소할 수 있는 상태 (확정 전까지만)
const CANCELLABLE = ["pending", "contacted"] as const;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;

  const booking = await prisma.booking.findUnique({ where: { id } });
  // 존재하지 않거나 본인 예약이 아니면 동일하게 404 (존재 여부 노출 방지)
  if (!booking || booking.userId !== session.user.id) {
    return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
  }

  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "이미 취소된 예약입니다." }, { status: 409 });
  }
  if (!CANCELLABLE.includes(booking.status as (typeof CANCELLABLE)[number])) {
    return NextResponse.json(
      { error: "확정된 예약은 1588-0000으로 전화 상담 후 취소할 수 있습니다." },
      { status: 409 }
    );
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: "cancelled" },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}
