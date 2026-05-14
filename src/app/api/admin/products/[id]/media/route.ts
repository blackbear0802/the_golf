// 상품 미디어 추가 API (POST) — role=admin 검증
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MediaType } from "@/generated/prisma/enums";

const VALID_TYPES = new Set<string>(Object.values(MediaType));

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id: productId } = await params;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json({ error: "상품을 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await req.json();
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const type = typeof body.type === "string" ? body.type : "";
  const caption =
    typeof body.caption === "string" && body.caption.trim()
      ? body.caption.trim()
      : null;

  if (!url) {
    return NextResponse.json({ error: "URL을 입력해주세요." }, { status: 400 });
  }
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "올바른 URL 형식이 아닙니다." }, { status: 400 });
  }
  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "미디어 타입이 올바르지 않습니다." }, { status: 400 });
  }

  const last = await prisma.productMedia.findFirst({
    where: { productId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const order = (last?.order ?? -1) + 1;

  const media = await prisma.productMedia.create({
    data: {
      productId,
      type: type as MediaType,
      url,
      caption,
      order,
    },
  });

  return NextResponse.json(media);
}
