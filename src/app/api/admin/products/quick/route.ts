// 어드민 빠른 등록 API — 본문 텍스트 + 업로드된 Blob 이미지 URL → AI 파싱 → 상품+미디어 생성
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseProduct } from "@/lib/claude-parser";
import {
  loadOperators,
  stripContacts,
  stripContactsFromArray,
  formatOperatorLine,
} from "@/lib/contact-replacer";
import { classifyImage } from "@/lib/media-classifier";
import { cleanPostText } from "@/lib/clean-post-text";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = await req.json();
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const imageUrls: string[] = Array.isArray(body.imageUrls)
    ? body.imageUrls.filter((u: unknown): u is string => typeof u === "string" && !!u)
    : [];
  const youtubeUrls: string[] = Array.isArray(body.youtubeUrls)
    ? body.youtubeUrls
        .filter((u: unknown): u is string => typeof u === "string" && !!u.trim())
        .map((u: string) => u.trim())
    : [];

  if (!text) {
    return NextResponse.json({ error: "본문을 입력해주세요." }, { status: 400 });
  }

  const cleanText = cleanPostText(text);
  const cleaned = stripContacts(cleanText);
  const parsed = cleaned ? await parseProduct(cleaned) : null;
  if (!parsed) {
    return NextResponse.json(
      { error: "AI 파싱 실패 — 목적지/출발일/박수 등 필수 정보가 본문에 부족합니다." },
      { status: 400 }
    );
  }

  const operators = await loadOperators();
  const operatorLine = formatOperatorLine(operators);
  const includedFinal = [
    ...stripContactsFromArray(parsed.included),
    ...(operatorLine ? [`담당: ${operatorLine}`] : []),
  ];
  const excludedFinal = stripContactsFromArray(parsed.excluded);

  const created = await prisma.product.create({
    data: {
      destination: parsed.destination,
      golfCourse: parsed.golfCourse,
      departureDate: new Date(`${parsed.departureDate}T00:00:00.000Z`),
      departureLabel: parsed.departureLabel,
      nights: parsed.nights,
      price: parsed.price,
      capacity: parsed.capacity,
      capacityLabel: parsed.capacityLabel,
      deadline: parsed.deadline
        ? new Date(`${parsed.deadline}T00:00:00.000Z`)
        : null,
      included: includedFinal,
      excluded: excludedFinal,
      sourceUrl: null,
      rawText: cleanText,
      autoImported: false,
    },
  });

  const mediaRows: Array<{
    productId: string;
    type: "golf" | "accommodation" | "dining" | "youtube";
    url: string;
    order: number;
  }> = [
    ...imageUrls.map((url, i) => ({
      productId: created.id,
      type: classifyImage(url, null, text),
      url,
      order: i,
    })),
    ...youtubeUrls.map((url, i) => ({
      productId: created.id,
      type: "youtube" as const,
      url,
      order: imageUrls.length + i,
    })),
  ];
  if (mediaRows.length > 0) {
    await prisma.productMedia.createMany({ data: mediaRows });
  }

  return NextResponse.json({ id: created.id, mediaCount: mediaRows.length });
}
