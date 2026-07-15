// 회원가입/로그인 입력값 검증 유틸 (클라이언트/서버 공용)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^010-?\d{4}-?\d{4}$/;
const PASSWORD_RE =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]).{8,}$/;

export function validateEmail(email: string): string | null {
  if (!email) return "이메일을 입력해주세요.";
  if (!EMAIL_RE.test(email)) return "올바른 이메일 형식이 아닙니다. (예: example@email.com)";
  return null;
}

export function validatePhone(phone: string): string | null {
  if (!phone) return "휴대전화 번호를 입력해주세요.";
  if (!PHONE_RE.test(phone))
    return "올바른 휴대전화 번호 형식이 아닙니다. (예: 010-1234-5678)";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "비밀번호를 입력해주세요.";
  if (password.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
  if (!PASSWORD_RE.test(password))
    return "비밀번호는 영문·숫자·특수문자를 모두 포함해야 합니다.";
  return null;
}

// 생년월일은 선택 항목. 값이 있을 때만 형식/범위를 검증한다. (YYYY-MM-DD)
const BIRTH_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateBirthDate(birthDate: string): string | null {
  if (!birthDate) return null;
  if (!BIRTH_DATE_RE.test(birthDate))
    return "올바른 생년월일 형식이 아닙니다. (예: 1970-05-26)";
  const date = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "올바른 생년월일이 아닙니다.";
  const year = date.getUTCFullYear();
  const now = new Date();
  if (date.getTime() > now.getTime()) return "생년월일이 미래일 수 없습니다.";
  if (year < 1900) return "생년월일을 다시 확인해주세요.";
  return null;
}
