// 어드민 상품 입력 검증/정규화 (POST/PATCH 공용)

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
  golfCourse: string | null;
  departureDate: Date;
  departureLabel: string | null;
  nights: number;
  price: number;
  capacity: number;
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

  const capacity = parseIntStrict(input.capacity);
  if (capacity === null || capacity < 1) return { error: "정원은 1 이상의 숫자여야 합니다." };

  const deadlineRaw = input.deadline;
  let deadline: Date | null = null;
  if (typeof deadlineRaw === "string" && deadlineRaw.trim()) {
    deadline = parseDateOnly(deadlineRaw);
    if (!deadline) return { error: "마감일을 YYYY-MM-DD 형식으로 입력해주세요." };
  }

  return {
    data: {
      destination,
      golfCourse: trimOrNull(input.golfCourse),
      departureDate,
      departureLabel: trimOrNull(input.departureLabel),
      nights,
      price,
      capacity,
      deadline,
      included: parseStringArray(input.included),
      excluded: parseStringArray(input.excluded),
      sourceUrl: trimOrNull(input.sourceUrl),
      rawText: trimOrNull(input.rawText),
    },
  };
}
