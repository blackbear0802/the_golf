// 어드민 예약 상태 변경 API (PATCH)
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ALLOWED_STATUS = ["pending", "contacted", "confirmed", "cancelled"] as const;
type Status = (typeof ALLOWED_STATUS)[number];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  const { status } = await req.json();
  if (!ALLOWED_STATUS.includes(status)) {
    return NextResponse.json({ error: "잘못된 상태값입니다." }, { status: 400 });
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: status as Status },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}
