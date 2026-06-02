// 어드민 상품 등록 API (POST) + 다중 삭제 API (DELETE) — role=admin 검증
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseProductInput } from "@/lib/admin-product";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = parseProductInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const created = await prisma.product.create({ data: parsed.data });
  revalidatePath("/packages");
  return NextResponse.json({ id: created.id });
}

// 다중 삭제 — body: { ids: string[] }. 활성 예약 있는 상품은 건너뛰고 사유 반환.
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { ids?: unknown };
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((v): v is string => typeof v === "string" && v.length > 0)
    : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "삭제할 상품 id가 없습니다." }, { status: 400 });
  }

  // 각 상품별 활성 예약 수를 한 번에 집계
  const grouped = await prisma.booking.groupBy({
    by: ["productId"],
    where: { productId: { in: ids }, status: { not: "cancelled" } },
    _count: { _all: true },
  });
  const activeMap = new Map<string, number>();
  for (const g of grouped) {
    if (g.productId) activeMap.set(g.productId, g._count._all);
  }

  const deletable: string[] = [];
  const skipped: { id: string; reason: string }[] = [];
  for (const id of ids) {
    const active = activeMap.get(id) ?? 0;
    if (active > 0) {
      skipped.push({ id, reason: `활성 예약 ${active}건` });
    } else {
      deletable.push(id);
    }
  }

  if (deletable.length > 0) {
    await prisma.$transaction([
      prisma.booking.updateMany({
        where: { productId: { in: deletable } },
        data: { productId: null },
      }),
      prisma.product.deleteMany({ where: { id: { in: deletable } } }),
    ]);
    revalidatePath("/packages");
  }

  return NextResponse.json({ deleted: deletable.length, skipped });
}
