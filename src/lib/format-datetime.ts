// 어드민 화면용 날짜·시간 포맷 — 항상 한국 시간(Asia/Seoul) 기준으로 표시.
// Vercel 함수가 어느 리전에서 돌든 어드민 눈에는 KST로 보이게 강제.

const KST_DATE_TIME = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const KST_DATE = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function toDate(v: Date | string | number | null | undefined): Date | null {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// "2026.06.02 14:35" 형태(KST). 잘못된 값이면 null 반환.
export function formatDateTimeKST(
  value: Date | string | number | null | undefined
): string | null {
  const d = toDate(value);
  if (!d) return null;
  // ko-KR 기본 출력은 "2026. 6. 2. 오후 2:35" 형식이라 직접 조립.
  const parts = KST_DATE_TIME.formatToParts(d);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}.${get("month")}.${get("day")} ${get("hour")}:${get("minute")}`;
}

// "2026.06.02" 형태(KST).
export function formatDateKST(
  value: Date | string | number | null | undefined
): string | null {
  const d = toDate(value);
  if (!d) return null;
  const parts = KST_DATE.formatToParts(d);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}.${get("month")}.${get("day")}`;
}
