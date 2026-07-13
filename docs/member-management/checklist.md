# 회원관리 기능 체크리스트

## 스키마 / 인증
- [x] `User` 모델에 `deletedAt DateTime?` 추가 (소프트 삭제 플래그)
- [x] `prisma db push` + client generate 성공
- [x] `auth.ts` authorize에서 탈퇴 회원(deletedAt != null) 로그인 차단

## 어드민 UI
- [x] 사이드바에 "회원 관리" 링크 추가 (예약 관리 다음)
- [x] `/admin/members` 목록 페이지 (이름·이메일·전화·가입일·역할·예약건수)
- [x] 검색(이름/이메일/전화) + 활성/탈퇴 필터
- [x] `MemberRoleSelect` 컴포넌트 (인라인 역할 변경)
- [x] `MemberDeleteButton` 컴포넌트 (소프트 삭제 / 복구)
- [x] `/admin/members/[id]` 상세 페이지 (회원 정보 + 예약 이력 + 문의 세션)

## API
- [x] `PATCH /api/admin/members/[id]` 역할 변경
- [x] `DELETE /api/admin/members/[id]` 소프트 삭제 (deletedAt 설정) + 복구(restore)
- [x] 본인 계정 강등/삭제 방지 가드

## 부수 정리
- [x] 대시보드 "회원 수" = 활성 회원만 카운트

## 검증
- [x] `npx tsc --noEmit` 통과
- [x] `npm run lint` — 내 파일 무결(기존 chat 컴포넌트 오류만 잔존, 이번 작업과 무관)

## 후속 (완료)
- [x] 탈퇴 회원 이메일 재가입 충돌 처리 (소프트 삭제 시 email tombstone → unique 슬롯 해제, 복구 시 원본 회수·충돌 알림)
- [x] 회원 목록 페이지네이션 (PAGE_SIZE=20, skip/take + count, 이전/다음 컨트롤, q·status 유지)

## 후속 검증
- [x] `npx tsc --noEmit` 통과
- [x] `npm run build` exit 0
