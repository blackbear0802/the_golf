# 어드민 상품 삭제 기능 — 체크리스트

## 정책 (확정)
- 삭제 가능 조건: 활성 예약(취소되지 않은 예약)이 0건인 상품
  - 예약 자체가 0건 → 삭제 가능
  - 예약이 있어도 전부 `cancelled` → 삭제 가능
  - `pending`/`contacted`/`confirmed` 예약이 1건이라도 있으면 삭제 불가
- 삭제 시 취소된 예약 레코드는 보존, `productId`만 null 처리 (고객 이력 유지)
- ProductMedia는 schema `onDelete: Cascade`로 자동 삭제

## 작업
- [x] 코드 구조 파악 (admin/products, DELETE API, schema 관계)
- [x] DELETE API: 활성 예약 기준으로 변경 + 취소예약 productId null 트랜잭션
- [x] DeleteProductButton 클라이언트 컴포넌트 (확인 + DELETE + refresh)
- [x] 상품 목록 페이지: 활성/취소 예약 수 계산 + 삭제 버튼 통합
- [x] 타입체크/린트 통과
- [ ] 사용자 동작 확인 (선택)
