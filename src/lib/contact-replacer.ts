// 본문/필드에서 공급자 연락처를 제거하고, 우리 측 담당자 정보로 치환
// AppConfig의 operator1/2 (각 name/phone/email) 를 사용

import { APP_CONFIG_KEYS, getConfigMany } from "@/lib/app-config";

const PHONE_RE = /(?:\+?82-?|0)?1[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/g;
const LANDLINE_RE = /(?:\+?82-?|0)?(?:2|[3-6]\d)[-.\s]?\d{3,4}[-.\s]?\d{4}/g;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const KAKAO_ID_RE = /(?:카카오톡|카톡|카카오|kakao)\s*(?:아이디|ID|id)?\s*:?\s*[A-Za-z0-9_]+/g;

export type Operator = {
  name: string;
  phone: string;
  email: string;
};

export async function loadOperators(): Promise<Operator[]> {
  const cfg = await getConfigMany([
    APP_CONFIG_KEYS.operator1Name,
    APP_CONFIG_KEYS.operator1Phone,
    APP_CONFIG_KEYS.operator1Email,
    APP_CONFIG_KEYS.operator2Name,
    APP_CONFIG_KEYS.operator2Phone,
    APP_CONFIG_KEYS.operator2Email,
  ]);
  const ops: Operator[] = [
    {
      name: cfg.operator1Name ?? "",
      phone: cfg.operator1Phone ?? "",
      email: cfg.operator1Email ?? "",
    },
    {
      name: cfg.operator2Name ?? "",
      phone: cfg.operator2Phone ?? "",
      email: cfg.operator2Email ?? "",
    },
  ];
  return ops.filter((o) => o.name && o.phone);
}

export function stripContacts(text: string): string {
  return text
    .replace(KAKAO_ID_RE, "")
    .replace(PHONE_RE, "")
    .replace(LANDLINE_RE, "")
    .replace(EMAIL_RE, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function formatOperatorLine(operators: Operator[]): string {
  if (operators.length === 0) return "";
  return operators.map((o) => `${o.name} ${o.phone}`).join(" / ");
}

export function stripContactsFromArray(arr: string[]): string[] {
  return arr.map((s) => stripContacts(s)).filter((s) => s.length > 0);
}
