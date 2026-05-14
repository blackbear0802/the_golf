// 상품 미디어 수정/삭제 API — role=admin 검증
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MediaType } from "@/generated/prisma/enums";

const VALID_TYPES = new Set<string>(Object.values(MediaType));

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  return null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; mediaId: string }> }
) {
  const denied = await assertAdmin();
  if (denied) return denied;

  const { id: productId, mediaId } = await params;
  const body = await req.json();

  const data: { caption?: string | null; type?: MediaType; order?: number } = {};

  if (body.caption !== undefined) {
    const c = typeof body.caption === "string" ? body.caption.trim() : "";
    data.caption = c || null;
  }
  if (body.type !== undefined) {
    if (!VALID_TYPES.has(body.type)) {
      return NextResponse.json({ error: "미디어 타입이 올바르지 않습니다." }, { status: 400 });
    }
    data.type = body.type as MediaType;
  }
  if (body.order !== undefined) {
    const n = Number(body.order);
    if (!Number.isInteger(n) || n < 0) {
      return NextResponse.json({ error: "순서 값이 올바르지 않습니다." }, { status: 400 });
    }
    data.order = n;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
  }

  const updated = await prisma.productMedia.updateMany({
    where: { id: mediaId, productId },
    data,
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: "미디어를 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; mediaId: string }> }
) {
  const denied = await assertAdmin();
  if (denied) return denied;

  const { id: productId, mediaId } = await params;
  const result = await prisma.productMedia.deleteMany({
    where: { id: mediaId, productId },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "미디어를 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
