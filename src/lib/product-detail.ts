// 상품 상세 표시용 데이터 가공 (상세페이지·랜딩팝업 공용)
// 담당자/연락처 제거·본문 노이즈 정리·유튜브 임베드 변환을 한 곳에서 관리해 두 화면이 항상 동일하게 보이도록 한다.
import { stripContacts } from "@/lib/contact-replacer";
import { cleanPostText } from "@/lib/clean-post-text";
import { APP_CONFIG_KEYS, getConfig } from "@/lib/app-config";

// 본문 표시 시점에 담당자/문의 줄을 제거하는 안전망.
// 빠른등록·자동크롤 모두 일관 적용. 어드민 차단어(bodyBlocklist) 설정을 따른다.
const DEFAULT_DISPLAY_BLOCKLIST = ["담당자", "문의하기", "문의", "위더스"];

export async function loadDisplayBlocklist(): Promise<string[]> {
  const raw = await getConfig(APP_CONFIG_KEYS.bodyBlocklist);
  if (raw === null) return DEFAULT_DISPLAY_BLOCKLIST;
  return raw.split("\n").map((s) => s.trim()).filter(Boolean);
}

function applyBlocklist(text: string, terms: string[]): string {
  if (!terms.length) return text;
  return text
    .split("\n")
    .filter((line) => !terms.some((term) => line.includes(term)))
    .join("\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// rawText → 표시용 본문: 1) cleanPostText로 노이즈 제거 → 2) 차단어 줄 통째 제거 → 3) stripContacts로 잔여 연락처 strip.
export function buildBodyText(
  rawText: string | null,
  blocklist: string[]
): string {
  if (!rawText) return "";
  return stripContacts(applyBlocklist(cleanPostText(rawText), blocklist)).trim();
}

// 포함/불포함 항목에서도 담당자·연락처 라인을 안전망으로 제거(기존 등록분 호환).
// "담당:" prefix는 차단어 "담당자"로는 안 잡혀 별도 처리.
export function filterListItems(items: string[], blocklist: string[]): string[] {
  return items
    .map((s) => stripContacts(s).trim())
    .filter(
      (s) =>
        s.length > 0 &&
        !/^담당\s*[:\-]/.test(s) &&
        !blocklist.some((term) => s.includes(term))
    );
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}년 ${m}월 ${d}일`;
}

export function getYoutubeEmbedUrl(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}
