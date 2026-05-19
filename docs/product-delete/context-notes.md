# 어드민 상품 삭제 — 컨텍스트 노트

## 배경
기존 DELETE `/api/admin/products/[id]`는 예약이 1건이라도 있으면(취소 포함)
무조건 409로 차단. 어드민 상품 목록 페이지엔 삭제 UI 자체가 없었음(수정만).

## 결정과 이유

### 1. 삭제 가능 = "활성 예약 0건"
- 사용자 요구: 예약 0건 OR 예약이 전부 취소된 상품은 삭제 가능.
- 곧 "취소되지 않은(non-cancelled) 예약이 하나도 없으면 삭제 가능".
- 판정 쿼리: `booking.count({ productId, status: { not: 'cancelled' } })`.

### 2. 취소 예약은 삭제하지 않고 productId만 null
- Booking은 고객 이력. 상품 삭제로 같이 지우면 고객/접수 기록 소실.
- `Booking.productId`는 nullable, `departureDate`/`nights`는 booking에 스냅샷됨.
  destination/golfCourse는 스냅샷 없음 → 삭제 후 마이페이지/어드민에서
  해당 취소건은 "상품 정보 없음"/"-"으로 표시(두 화면 모두 null 안전 처리 확인됨).
- 트랜잭션으로 취소 예약 productId→null 후 product.delete.
  (Prisma optional 관계 기본 onDelete=SetNull이지만 동작을 명시적으로 보장.)

### 3. ProductMedia
- schema에서 `onDelete: Cascade` → product 삭제 시 자동 삭제. 별도 처리 불필요.

### 4. UI
- 기존 `BookingStatusSelect`/`CancelBookingButton` 패턴 답습한
  `DeleteProductButton` 클라이언트 컴포넌트(confirm + DELETE + router.refresh).
- 목록 쿼리를 `_count.bookings` → `bookings: { select: { status } }`로 변경,
  총건수/취소건수/활성건수를 JS에서 계산(어드민 소규모, Prisma _count 동일관계
  이중 필터 제약 회피). 미디어 수는 `_count.media` 유지.
- 삭제 불가 상품은 버튼 대신 사유 노출("활성 예약 N건").
- 예약 컬럼에 "(취소 N)" 보조 표기 추가 — 삭제 가능 여부 근거를 어드민이
  바로 이해하도록(기능에 직접 연관된 최소 표시).
