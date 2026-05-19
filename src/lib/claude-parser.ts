// Claude(Anthropic) API로 게시글 본문 → 상품 필드 JSON 추출
// Haiku 4.5 사용 (비용 효율). 실패 시 null 반환해 호출부가 skip 가능.

import Anthropic from "@anthropic-ai/sdk";

export type ParsedProductFields = {
  destination: string;
  golfCourse: string | null;
  departureDate: string; // YYYY-MM-DD (범위/미상이면 근사 시작일)
  departureLabel: string | null; // 범위/느슨한 일정의 원문 표기. 정확 단일일자면 null
  nights: number;
  price: number;
  capacity: number;
  capacityLabel: string | null; // 모집인원이 범위/느슨/미기재일 때 원문 표기. 명확 숫자면 null
  deadline: string | null;
  included: string[];
  excluded: string[];
};

const SYSTEM_PROMPT = `당신은 한국어 골프 투어 상품 게시글에서 정형 데이터를 추출하는 도우미입니다.
출력은 반드시 아래 스키마의 JSON 한 개만 (다른 설명 없이):

{
  "destination": "string  // 예: '태국 방콕', '일본 후쿠오카', '베트남 다낭'",
  "golfCourse": "string | null  // 골프장 이름",
  "departureDate": "YYYY-MM-DD  // 단일 출발일. 범위/미상이면 가장 이른 출발 근사일",
  "departureLabel": "string | null  // 일정이 '7월~8월', '6월 중 매주' 처럼 단일 날짜가 아니면 사람이 읽는 형태로(연도 포함) 그대로. 정확한 단일 출발일이면 null",
  "nights": number,
  "price": number,  // 1인당 가격, 원 단위. 여러 등급이면 가장 낮은 가격
  "capacity": number,  // 모집인원 수. 본문에 인원 숫자가 하나라도 있으면 그 수('16명'→16, '선착순 16명'→16). 인원 숫자가 전혀 없으면 0
  "capacityLabel": "string | null  // 인원 숫자가 전혀 없을 때만(예: '선착순', '소수정예', '2인 출발 가능') 그 표현 그대로. 숫자가 있으면 반드시 null",
  "deadline": "YYYY-MM-DD | null",
  "included": ["string", ...],  // 포함사항. 한 항목씩 분리
  "excluded": ["string", ...]   // 불포함사항
}

규칙:
1. 정보가 본문에 명시되지 않으면 number는 0, string은 빈 문자열 "", 그 외는 null/[]
2. 연락처(전화번호·이메일·카카오톡 ID 등)는 절대 included/excluded에 넣지 마세요. 별도로 치환됩니다.
3. 가격이 "129만원" 같이 표기되면 1290000으로 정규화
4. 오늘은 {{TODAY}} 이다. 본문에 연도가 없으면 과거가 되지 않도록 오늘 이후 가장 가까운 연도를 사용하라 (사진 촬영일 등 일정과 무관한 날짜의 연도에 끌리지 말 것)
5. departureLabel은 일정이 범위/불명확할 때만 채우고, 그때 departureDate에는 그 기간의 근사 시작일을 넣어라. 단일 정확 날짜면 departureLabel=null
6. 모집인원: 본문에 인원 숫자가 하나라도 있으면 capacity=그 수, capacityLabel=null ("선착순 16명"도 capacity=16). 인원 숫자가 전혀 없을 때만(예: "선착순", "소수정예", "2인 출발 가능") capacity=0, capacityLabel=그 표현
7. JSON 외 어떤 텍스트도 출력하지 마세요`;

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
    system: SYSTEM_PROMPT.replace("{{TODAY}}", new Date().toISOString().slice(0, 10)),
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

  if (nights < 1) return null;

  const deadline =
    typeof data.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.deadline)
      ? data.deadline
      : null;

  const departureLabel =
    typeof data.departureLabel === "string" && data.departureLabel.trim()
      ? data.departureLabel.trim()
      : null;

  const capacityLabel =
    typeof data.capacityLabel === "string" && data.capacityLabel.trim()
      ? data.capacityLabel.trim()
      : null;

  return {
    destination,
    golfCourse:
      typeof data.golfCourse === "string" && data.golfCourse.trim() ? data.golfCourse.trim() : null,
    departureDate,
    departureLabel,
    nights,
    price,
    capacity,
    capacityLabel,
    deadline,
    included: Array.isArray(data.included)
      ? data.included.map((v) => String(v).trim()).filter(Boolean)
      : [],
    excluded: Array.isArray(data.excluded)
      ? data.excluded.map((v) => String(v).trim()).filter(Boolean)
      : [],
  };
}
