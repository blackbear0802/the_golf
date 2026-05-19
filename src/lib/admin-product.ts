// 어드민 상품 입력 검증/정규화 (POST/PATCH 공용)

import { regionFieldsFor } from "./regions";

export type ProductInput = {
  destination?: unknown;
  golfCourse?: unknown;
  departureDate?: unknown;
  departureLabel?: unknown;
  nights?: unknown;
  price?: unknown;
  capacity?: unknown;
  deadline?: unknown;
  included?: unknown;
  excluded?: unknown;
  sourceUrl?: unknown;
  rawText?: unknown;
};

export type ParsedProduct = {
  destination: string;
  countryCode: string | null;
  regionCode: string | null;
  golfCourse: string | null;
  departureDate: Date;
  departureLabel: string | null;
  nights: number;
  price: number;
  capacity: number;
  capacityLabel: string | null;
  deadline: Date | null;
  included: string[];
  excluded: string[];
  sourceUrl: string | null;
  rawText: string | null;
};

function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== "string" || !value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseIntStrict(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.floor(value);
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.floor(n) : null;
  }
  return null;
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  return [];
}

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t ? t : null;
}

export function parseProductInput(
  input: ProductInput
): { data: ParsedProduct } | { error: string } {
  const destination = typeof input.destination === "string" ? input.destination.trim() : "";
  if (!destination) return { error: "목적지를 입력해주세요." };

  const departureDate = parseDateOnly(input.departureDate);
  if (!departureDate) return { error: "출발일을 YYYY-MM-DD 형식으로 입력해주세요." };

  const nights = parseIntStrict(input.nights);
  if (nights === null || nights < 1) return { error: "박수는 1 이상의 숫자여야 합니다." };

  const price = parseIntStrict(input.price);
  if (price === null || price < 0) return { error: "가격은 0 이상의 숫자여야 합니다." };

  // 정원: 한 칸 입력을 분해. 숫자(예: '16', '16명')면 capacity, 그 외 텍스트면 capacityLabel
  const capInput = typeof input.capacity === "string" ? input.capacity.trim() : "";
  let capacity = 0;
  let capacityLabel: string | null = null;
  if (capInput) {
    const numMatch = capInput.match(/^(\d{1,5})\s*명?$/);
    if (numMatch) capacity = parseInt(numMatch[1], 10);
    else capacityLabel = capInput;
  }

  const deadlineRaw = input.deadline;
  let deadline: Date | null = null;
  if (typeof deadlineRaw === "string" && deadlineRaw.trim()) {
    deadline = parseDateOnly(deadlineRaw);
    if (!deadline) return { error: "마감일을 YYYY-MM-DD 형식으로 입력해주세요." };
  }

  return {
    data: {
      destination,
      ...regionFieldsFor(destination),
      golfCourse: trimOrNull(input.golfCourse),
      departureDate,
      departureLabel: trimOrNull(input.departureLabel),
      nights,
      price,
      capacity,
      capacityLabel,
      deadline,
      included: parseStringArray(input.included),
      excluded: parseStringArray(input.excluded),
      sourceUrl: trimOrNull(input.sourceUrl),
      rawText: trimOrNull(input.rawText),
    },
  };
}
