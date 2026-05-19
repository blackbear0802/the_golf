// 매트릭스용 국가/지역 메타 + destination 텍스트 → 코드 큐레이션 사전
//
// 자동 추론 불가(밴드 크롤 destination이 자유 텍스트). 사람이 큐레이션한
// 정확 일치 사전이 단일 진실원. 사전에 없는 destination → null 반환
// (매트릭스 비노출, 목록엔 destination으로 여전히 노출 — degrade 허용).

export type RegionMeta = {
  countryCode: string;
  countryName: string;
  regionName: string;
  /** 매트릭스 세로축 정렬 순서(작을수록 위) */
  displayOrder: number;
};

/** regionCode → 지역 메타. 매트릭스 세로축 라벨·정렬의 단일 출처. */
export const REGION_META: Record<string, RegionMeta> = {
  chiangmai: { countryCode: "TH", countryName: "태국", regionName: "치앙마이", displayOrder: 10 },
  danang: { countryCode: "VN", countryName: "베트남", regionName: "다낭", displayOrder: 20 },
  fukuoka: { countryCode: "JP", countryName: "일본", regionName: "후쿠오카", displayOrder: 30 },
  tokyo: { countryCode: "JP", countryName: "일본", regionName: "도쿄", displayOrder: 31 },
  cebu: { countryCode: "PH", countryName: "필리핀", regionName: "세부", displayOrder: 40 },
  kotakinabalu: { countryCode: "MY", countryName: "말레이시아", regionName: "코타키나발루", displayOrder: 50 },
  yancheng: { countryCode: "CN", countryName: "중국", regionName: "염성", displayOrder: 60 },
};

/**
 * raw destination(trim 후 정확 일치) → regionCode.
 * 중국 3변형(염성 쑤첸 / 쑤첸 / 염성(쑤첸))은 동일 지역이라 yancheng으로 흡수
 * (사용자 도메인 확정, context-notes 2026-05-19 참조).
 */
const DESTINATION_TO_REGION: Record<string, string> = {
  "태국 치앙마이": "chiangmai",
  "베트남 다낭": "danang",
  "일본 후쿠오카": "fukuoka",
  "일본 동경": "tokyo",
  "필리핀 세부": "cebu",
  "말레이시아 코타키나발루": "kotakinabalu",
  "중국 염성 쑤첸": "yancheng",
  "중국 쑤첸": "yancheng",
  "중국 염성(쑤첸)": "yancheng",
};

export type RegionCodes = { countryCode: string; regionCode: string };

/**
 * destination 텍스트를 country/region 코드로 매핑.
 * 사전에 없으면 null (호출부에서 경고·null 저장, 상품 생성은 막지 않음).
 */
export function mapDestination(destination: string | null | undefined): RegionCodes | null {
  if (!destination) return null;
  const regionCode = DESTINATION_TO_REGION[destination.trim()];
  if (!regionCode) return null;
  const meta = REGION_META[regionCode];
  if (!meta) return null;
  return { countryCode: meta.countryCode, regionCode };
}

/**
 * product create/update의 data에 펼쳐 쓰는 형태.
 * 매핑 실패 시 둘 다 null(상품 생성을 막지 않음 — 매트릭스만 비노출).
 */
export function regionFieldsFor(
  destination: string | null | undefined
): { countryCode: string | null; regionCode: string | null } {
  const codes = mapDestination(destination);
  return {
    countryCode: codes?.countryCode ?? null,
    regionCode: codes?.regionCode ?? null,
  };
}

/** 매트릭스 세로축 순서(displayOrder 오름차순)의 regionCode 목록. */
export function orderedRegionCodes(): string[] {
  return Object.entries(REGION_META)
    .sort((a, b) => a[1].displayOrder - b[1].displayOrder)
    .map(([code]) => code);
}
