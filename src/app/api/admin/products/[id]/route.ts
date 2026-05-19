// 어드민 상품 수정/삭제 API — role=admin 검증
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseProductInput } from "@/lib/admin-product";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = parseProductInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const updated = await prisma.product.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json({ id: updated.id });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;

  // 취소되지 않은(활성) 예약이 1건이라도 있으면 삭제 불가
  const activeBookingCount = await prisma.booking.count({
    where: { productId: id, status: { not: "cancelled" } },
  });
  if (activeBookingCount > 0) {
    return NextResponse.json(
      { error: `취소되지 않은 예약 ${activeBookingCount}건이 연결된 상품은 삭제할 수 없습니다.` },
      { status: 409 }
    );
  }

  // 취소 예약 이력은 보존하고 상품 연결만 끊은 뒤 상품 삭제 (미디어는 Cascade)
  await prisma.$transaction([
    prisma.booking.updateMany({
      where: { productId: id },
      data: { productId: null },
    }),
    prisma.product.delete({ where: { id } }),
  ]);
  return NextResponse.json({ ok: true });
}
