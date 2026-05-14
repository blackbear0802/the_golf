// Claude(Anthropic) API로 게시글 본문 → 상품 필드 JSON 추출
// Haiku 4.5 사용 (비용 효율). 실패 시 null 반환해 호출부가 skip 가능.

import Anthropic from "@anthropic-ai/sdk";

export type ParsedProductFields = {
  destination: string;
  golfCourse: string | null;
  departureDate: string; // YYYY-MM-DD
  nights: number;
  price: number;
  capacity: number;
  deadline: string | null;
  included: string[];
  excluded: string[];
};

const SYSTEM_PROMPT = `당신은 한국어 골프 투어 상품 게시글에서 정형 데이터를 추출하는 도우미입니다.
출력은 반드시 아래 스키마의 JSON 한 개만 (다른 설명 없이):

{
  "destination": "string  // 예: '태국 방콕', '일본 후쿠오카', '베트남 다낭'",
  "golfCourse": "string | null  // 골프장 이름",
  "departureDate": "YYYY-MM-DD  // 출발일이 범위면 시작일",
  "nights": number,
  "price": number,  // 1인당 가격, 원 단위. 여러 등급이면 가장 낮은 가격
  "capacity": number,  // 정원/모집인원
  "deadline": "YYYY-MM-DD | null",
  "included": ["string", ...],  // 포함사항. 한 항목씩 분리
  "excluded": ["string", ...]   // 불포함사항
}

규칙:
1. 정보가 본문에 명시되지 않으면 number는 0, string은 빈 문자열 "", 그 외는 null/[]
2. 연락처(전화번호·이메일·카카오톡 ID 등)는 절대 included/excluded에 넣지 마세요. 별도로 치환됩니다.
3. 가격이 "129만원" 같이 표기되면 1290000으로 정규화
4. JSON 외 어떤 텍스트도 출력하지 마세요`;

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.");
  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

export async function parseProduct(text: string): Promise<ParsedProductFields | null> {
  if (!text.trim()) return null;

  const client = getClient();
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: text }],
  });

  const block = msg.content[0];
  if (!block || block.type !== "text") return null;

  const match = /\{[\s\S]*\}/.exec(block.text);
  if (!match) return null;

  try {
    const data = JSON.parse(match[0]) as Partial<ParsedProductFields>;
    return normalize(data);
  } catch {
    return null;
  }
}

function normalize(data: Partial<ParsedProductFields>): ParsedProductFields | null {
  const destination = typeof data.destination === "string" ? data.destination.trim() : "";
  if (!destination) return null;

  const departureDate =
    typeof data.departureDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.departureDate)
      ? data.departureDate
      : "";
  if (!departureDate) return null;

  const nights = typeof data.nights === "number" && data.nights > 0 ? Math.floor(data.nights) : 0;
  const price = typeof data.price === "number" && data.price >= 0 ? Math.floor(data.price) : 0;
  const capacity =
    typeof data.capacity === "number" && data.capacity > 0 ? Math.floor(data.capacity) : 0;

  if (nights < 1 || capacity < 1) return null;

  const deadline =
    typeof data.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.deadline)
      ? data.deadline
      : null;

  return {
    destination,
    golfCourse:
      typeof data.golfCourse === "string" && data.golfCourse.trim() ? data.golfCourse.trim() : null,
    departureDate,
    nights,
    price,
    capacity,
    deadline,
    included: Array.isArray(data.included)
      ? data.included.map((v) => String(v).trim()).filter(Boolean)
      : [],
    excluded: Array.isArray(data.excluded)
      ? data.excluded.map((v) => String(v).trim()).filter(Boolean)
      : [],
  };
}
