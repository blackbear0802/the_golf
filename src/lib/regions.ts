// 매트릭스용 destination 자동 파싱 — 안정적인 국가명만 사전 앵커로 두고
// 그 뒤를 지역명으로 자동 분리. regionCode = "<국가코드>-<공백제거 지역명>".
//
// destination이 자유 텍스트(밴드 크롤·수동 등록 원문)라 국가 단위만 사람이
// 큐레이션하고, 지역은 자동 추출한다. 알려진 국가명으로 시작하지 않으면 null
// (매트릭스 비노출, 목록엔 destination으로 노출 — degrade 허용).

// 국가명 → ISO alpha-2 + 매트릭스 국가 정렬순서(작을수록 위). 새 국가만 추가.
const COUNTRY: Record<string, { code: string; order: number }> = {
  태국: { code: "TH", order: 1 },
  베트남: { code: "VN", order: 2 },
  일본: { code: "JP", order: 3 },
  필리핀: { code: "PH", order: 4 },
  말레이시아: { code: "MY", order: 5 },
  중국: { code: "CN", order: 6 },
};

// 같은 지역의 표기 변형을 표준 표기로 통일(파싱 전 정규화).
// 동일 지역인데 표기만 다른 경우만 등록(자동 분리로는 못 합치는 케이스).
const ALIAS: Record<string, string> = {
  "중국 염성(쑤첸)": "중국 염성 쑤첸",
  "중국 쑤첸": "중국 염성 쑤첸",
  "일본 동경": "일본 도쿄",
};

export type RegionInfo = {
  countryCode: string;
  countryName: string;
  countryOrder: number;
  regionCode: string;
  regionName: string;
};

/**
 * destination 텍스트를 국가/지역 정보로 자동 파싱.
 * 알려진 국가명으로 시작 + 뒤에 지역명이 있어야 매핑. 그 외 null.
 */
export function parseDestination(
  destination: string | null | undefined
): RegionInfo | null {
  if (!destination) return null;
  const raw = destination.trim();
  if (!raw) return null;
  const s = ALIAS[raw] ?? raw;
  for (const [name, meta] of Object.entries(COUNTRY)) {
    if (s.startsWith(name)) {
      const regionName = s.slice(name.length).trim();
      if (!regionName) return null;
      return {
        countryCode: meta.code,
        countryName: name,
        countryOrder: meta.order,
        regionCode: `${meta.code}-${regionName.replace(/\s+/g, "")}`,
        regionName,
      };
    }
  }
  return null;
}

/**
 * product create/update의 data에 펼쳐 쓰는 형태.
 * 매핑 실패 시 둘 다 null(상품 생성을 막지 않음 — 매트릭스만 비노출).
 */
export function regionFieldsFor(
  destination: string | null | undefined
): { countryCode: string | null; regionCode: string | null } {
  const info = parseDestination(destination);
  return {
    countryCode: info?.countryCode ?? null,
    regionCode: info?.regionCode ?? null,
  };
}

/**
 * 매트릭스 세로축 정렬 비교자(국가 order → 지역명 한글 가나다).
 * 정적 사전 대신 실제 데이터의 RegionInfo 목록을 정렬할 때 사용.
 */
export function compareRegions(a: RegionInfo, b: RegionInfo): number {
  if (a.countryOrder !== b.countryOrder) return a.countryOrder - b.countryOrder;
  return a.regionName.localeCompare(b.regionName, "ko");
}
