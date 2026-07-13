// 회원 소프트 삭제 시 이메일 unique 슬롯을 비우기 위한 tombstone 유틸
// 탈퇴 회원의 email에 접미사를 붙여 같은 이메일 재가입이 가능하도록 함.
// 구분자로 공백을 쓰는 이유: 유효한 이메일에는 공백이 올 수 없어(validators EMAIL_RE),
// 원본 복원 시 첫 공백 기준으로 안전하게 잘라낼 수 있음.

const TOMBSTONE_SEP = " #deleted-";

// 탈퇴 처리용 이메일. null이면 그대로 null.
export function tombstoneEmail(email: string | null, userId: string): string | null {
  if (!email) return null;
  return `${email}${TOMBSTONE_SEP}${userId}`;
}

// tombstone 접미사를 떼어낸 원본 이메일(표시·복구·검색 매칭용). 평범한 이메일이면 그대로 반환.
export function baseEmail(email: string | null): string | null {
  if (!email) return null;
  return email.split(" ")[0];
}
