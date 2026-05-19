# 마이페이지 예약 취소 기능 — 체크리스트

## 정책 (확정)
- 사용자 자가 취소 가능 상태: `pending`(접수 대기), `contacted`(상담 진행 중)
- 취소 불가: `confirmed`(예약 확정 — 결제/환불 얽힘, 전화 상담), `cancelled`(이미 취소됨)
- 취소 = 레코드 삭제 아님. `status = cancelled`로 변경 (어드민 흐름과 동일, 기록 보존)

## 작업
- [x] 코드 구조 파악 (my/page.tsx, bookings API, schema, BookingStatusSelect)
- [x] 취소 정책 사용자 확정
- [x] `POST /api/bookings/[id]/cancel` 사용자 취소 API (인증·소유권·상태 검증)
- [x] `CancelBookingButton` 클라이언트 컴포넌트 (확인 다이얼로그 + router.refresh)
- [x] `/my` 예약 카드에 조건부 취소 버튼 통합
- [x] 확정 건 카드에 "전화 상담 취소" 안내 문구 추가
- [x] 빌드/타입체크 통과 확인
- [ ] 사용자 동작 확인 (선택)
