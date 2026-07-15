// 회원가입 선택 항목(성별/구력/핸디캡/거주지역)의 옵션·라벨 정의 (클라이언트/서버 공용)

export const GENDER_OPTIONS = [
  { value: "male", label: "남성" },
  { value: "female", label: "여성" },
] as const;

export const GOLF_CAREER_OPTIONS = [
  "1년 미만",
  "1~3년",
  "3~5년",
  "5~10년",
  "10년 이상",
] as const;

export const HANDICAP_OPTIONS = [
  "100타 이상",
  "90타대",
  "80타대",
  "싱글(70타대)",
  "잘 모름",
] as const;

export const REGION_OPTIONS = [
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "경기",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
] as const;

export type GenderValue = (typeof GENDER_OPTIONS)[number]["value"];

const GENDER_VALUES = GENDER_OPTIONS.map((o) => o.value);

export function isGender(value: string): value is GenderValue {
  return (GENDER_VALUES as readonly string[]).includes(value);
}

export function isGolfCareer(value: string): boolean {
  return (GOLF_CAREER_OPTIONS as readonly string[]).includes(value);
}

export function isHandicap(value: string): boolean {
  return (HANDICAP_OPTIONS as readonly string[]).includes(value);
}

export function isRegion(value: string): boolean {
  return (REGION_OPTIONS as readonly string[]).includes(value);
}

export function genderLabel(value: string | null | undefined): string | null {
  return GENDER_OPTIONS.find((o) => o.value === value)?.label ?? null;
}
