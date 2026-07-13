# 회원관리 기능 - 컨텍스트 노트

## 결정 사항
- **소프트 삭제 방식**: `User.deletedAt DateTime?` 단일 컬럼. null = 활성, 값 있음 = 탈퇴.
  - 사유: 예약(Booking)이 User를 외래키로 참조하므로 하드 삭제 시 이력 유실/제약 위반. 사용자가 "단순 플래그 처리" 요청.
  - deletedAt(타임스탬프)을 쓰면 탈퇴 시점 감사(audit)도 함께 남음. boolean보다 정보량 많고 컬럼 수는 동일.
- **로그인 차단**: 탈퇴 회원이 남은 세션/재로그인으로 못 들어오도록 `auth.ts` authorize에서 deletedAt 체크.
- **패턴 재사용**: 예약 관리(`/admin/bookings`)와 동일한 구조.
  - 서버 컴포넌트 목록 + 클라 컴포넌트 인라인 mutation + PATCH API + `router.refresh()`.
  - 권한: 레이아웃 `requireAdmin()` + API에서 `session.user.role !== "admin"` 체크.
- **메뉴 위치**: 대시보드 · 예약 관리 · **회원 관리** · 상품 관리 · 설정.

## 가드 / 엣지 케이스
- 관리자가 **본인 계정을 강등(admin→user)하거나 삭제**하는 것을 API에서 차단 (self-lockout 방지).
- 목록 기본은 활성 회원만. `?status=deleted`로 탈퇴 회원 조회, 탈퇴 회원은 "복구" 가능.
- 검색은 서버 컴포넌트 searchParams로 처리(별도 API 불필요), 이름/이메일/전화 부분일치(대소문자 무시).
- 이메일 unique 제약: 탈퇴 회원 이메일 재사용(재가입 충돌)은 이번 범위 밖. 필요 시 후속.

## 후속 과제 처리 (2차)
### 탈퇴 회원 이메일 재가입 충돌
- 방식: **email tombstone**. 소프트 삭제 시 `email`을 `"원본 #deleted-<userId>"`로 변경(`src/lib/member.ts`).
  - 구분자로 공백 사용 — 유효 이메일엔 공백 불가(validators EMAIL_RE)라 첫 공백 기준 원본 복원이 안전.
  - unique 슬롯이 비워져 같은 이메일 재가입이 자연히 풀림. **signup·auth 코드 변경 불필요**(평범한 이메일로는 tombstone 행이 매칭 안 됨).
- 대안 기각: `email @unique` 제거 후 partial unique index(`WHERE deleted_at IS NULL`)는 `db push` 반복 워크플로에서 인덱스가 깨질 위험 → 채택 안 함.
- 표시/검색: `baseEmail()`로 접미사 제거해 목록·상세에 원본 표시. 검색은 `contains`라 tombstone 안에 원본이 있어 그대로 매칭.
- 복구: 원본 이메일 회수. 단 그 사이 같은 이메일로 재가입한 **활성 회원**이 있으면 unique 충돌 → 이메일 복구 보류하고 `warning` 반환(버튼에서 alert).
- 주의: 이번 변경 이전에 소프트 삭제된 기존 행(있다면)은 tombstone 안 돼 있어 재가입을 막을 수 있음. 신규 기능이라 실데이터 없을 것으로 보고 마이그레이션 스크립트는 생략. 필요 시 일괄 tombstone 스크립트 추가.

### 회원 목록 페이지네이션
- `PAGE_SIZE=20`, `skip/take` + `count`(same where) 동시 조회. 헤더 인원수는 `total` 기준.
- `buildHref(page)`가 q·status 유지하며 page만 갱신(page=1이면 생략). 검색 폼·필터 탭은 page 미포함→1페이지로 리셋.
