// 어드민 빠른 등록 API — 본문 텍스트 + 업로드된 Blob 이미지 URL → AI 파싱 → 상품+미디어 생성
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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
import { regionFieldsFor } from "@/lib/regions";
import { APP_CONFIG_KEYS, getConfig } from "@/lib/app-config";

// 어드민 설정 미적용 상태에서 동작 보장용 기본 차단어 — 어드민이 명시적으로 빈 값을 저장하면 차단 없음
const DEFAULT_BODY_BLOCKLIST = ["문의", "위더스골프"];

async function loadBodyBlocklist(): Promise<string[]> {
  const raw = await getConfig(APP_CONFIG_KEYS.bodyBlocklist);
  if (raw === null) return DEFAULT_BODY_BLOCKLIST;
  return raw.split("\n").map((s) => s.trim()).filter(Boolean);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = await req.json();
  const text = typeof body.text === "string" ? body.text.trim() : "";
  // 신형: images[{url, caption}] / 레거시: imageUrls[string] 폴백
  const images: { url: string; caption: string }[] = Array.isArray(body.images)
    ? body.images
        .filter(
          (m: unknown): m is { url: string; caption?: unknown } =>
            !!m && typeof (m as { url?: unknown }).url === "string" && !!(m as { url: string }).url
        )
        .map((m: { url: string; caption?: unknown }) => ({
          url: m.url,
          caption: typeof m.caption === "string" ? m.caption : "",
        }))
    : Array.isArray(body.imageUrls)
      ? body.imageUrls
          .filter((u: unknown): u is string => typeof u === "string" && !!u)
          .map((url: string) => ({ url, caption: "" }))
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

  // 본문 정제 정책 — 차단어 줄 통째 삭제 → 잔여 공급자 연락처 strip → 끝에 우리 측 담당자 한 줄 append.
  // 표시 단계는 autoImported=false 행의 stripContacts 안전망을 건너뛰므로, 여기서 확실히 정제해 둬야 함.
  // 차단어는 어드민 설정(AppConfig.bodyBlocklist)에서 관리. 미설정 시 DEFAULT_BODY_BLOCKLIST 사용.
  const blocklistTerms = await loadBodyBlocklist();
  const bodyForStore = (() => {
    const filtered = blocklistTerms.length
      ? cleanText
          .split("\n")
          .filter((line) => !blocklistTerms.some((term) => line.includes(term)))
          .join("\n")
      : cleanText;
    const cleaned = stripContacts(
      filtered.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n")
    ).trim();
    if (!operatorLine) return cleaned;
    return cleaned ? `${cleaned}\n\n담당자 : ${operatorLine}` : `담당자 : ${operatorLine}`;
  })();

  const region = regionFieldsFor(parsed.destination);
  if (!region.regionCode) {
    console.warn(
      `[regions] 빠른등록 destination 미매핑 — 매트릭스 비노출: "${parsed.destination}"`
    );
  }

  const created = await prisma.product.create({
    data: {
      destination: parsed.destination,
      ...region,
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
      rawText: bodyForStore,
      autoImported: false,
    },
  });

  const mediaRows: Array<{
    productId: string;
    type: "golf" | "accommodation" | "dining" | "youtube";
    url: string;
    caption: string | null;
    order: number;
  }> = [
    ...images.map(({ url, caption }, i) => {
      const cleanCaption = stripContacts(caption).trim();
      return {
        productId: created.id,
        type: classifyImage(url, cleanCaption || null, text),
        url,
        caption: cleanCaption || null,
        order: i,
      };
    }),
    ...youtubeUrls.map((url, i) => ({
      productId: created.id,
      type: "youtube" as const,
      url,
      caption: null,
      order: images.length + i,
    })),
  ];
  if (mediaRows.length > 0) {
    await prisma.productMedia.createMany({ data: mediaRows });
  }

  revalidatePath("/packages");
  return NextResponse.json({ id: created.id, mediaCount: mediaRows.length });
}
