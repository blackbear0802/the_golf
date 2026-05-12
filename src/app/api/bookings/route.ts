// 예약 홀딩 생성 API (인증 필수)
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { productId, headcount, additionalRequest } = await req.json();

  if (!productId) {
    return NextResponse.json({ error: "상품 정보가 누락되었습니다." }, { status: 400 });
  }
  const count = Number(headcount);
  if (!Number.isInteger(count) || count < 1) {
    return NextResponse.json({ error: "인원을 올바르게 입력해주세요." }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return NextResponse.json({ error: "존재하지 않는 상품입니다." }, { status: 404 });
  }
  if (count > product.capacity) {
    return NextResponse.json(
      { error: `최대 ${product.capacity}명까지 신청 가능합니다.` },
      { status: 400 }
    );
  }

  const booking = await prisma.booking.create({
    data: {
      userId: session.user.id,
      productId: product.id,
      departureDate: product.departureDate,
      nights: product.nights,
      headcount: count,
      additionalRequest: additionalRequest?.trim() || null,
    },
  });

  return NextResponse.json({ id: booking.id });
}
