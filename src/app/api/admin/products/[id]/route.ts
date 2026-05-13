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

  const bookingCount = await prisma.booking.count({ where: { productId: id } });
  if (bookingCount > 0) {
    return NextResponse.json(
      { error: `예약 ${bookingCount}건이 연결된 상품은 삭제할 수 없습니다.` },
      { status: 409 }
    );
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
