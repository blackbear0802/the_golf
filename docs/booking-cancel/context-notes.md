# 마이페이지 예약 취소 — 컨텍스트 노트

## 배경
`/my` 페이지(`src/app/my/page.tsx`)는 서버 컴포넌트로 예약 목록만 표시하고
취소 수단이 없었음. 사용자용 예약 변경 API도 없었고, 어드민 PATCH
(`/api/admin/bookings/[id]`, role=admin 전용)만 존재.

## 결정과 이유

### 1. 취소 가능 범위 = 확정 전까지 (pending, contacted)
- 이 서비스는 "예약 문의 접수 → 상담원이 24h 내 전화 → 확정" 상담형 모델.
- `confirmed`는 결제/환불이 얽힐 수 있어 자가 취소 대신 전화 상담이 안전.
- `cancelled`는 이미 취소된 건이라 재취소 무의미.
- 사용자가 "확정 전까지만 (권장)" 선택.

### 2. 전용 엔드포인트 (`POST /api/bookings/[id]/cancel`)
- 어드민 PATCH처럼 임의 status 변경을 사용자에게 노출하지 않기 위해
  의도가 고정된 단일 목적 엔드포인트로 설계.
- 검증 순서: 인증 → 예약 존재 → 소유권(userId 일치) → 상태가 취소 가능.
  - 소유권 불일치/없음은 404로 통일(존재 여부 노출 방지).
  - 취소 불가 상태는 409.

### 3. 취소 = soft (status=cancelled)
- 레코드 삭제하지 않음. 어드민 화면/통계와 일관, 기록 보존.
- `my/page.tsx`의 STATUS_LABEL에 이미 `cancelled: "취소됨"` 존재 → 추가 UI 불필요.

### 4. UI 통합 (surgical)
- 기존 "상품 다시 보기" Link의 `mt-3`를 부모 flex 컨테이너로 이동,
  취소 버튼을 형제로 추가. 레이아웃 변경 최소화.
- 버튼은 `pending|contacted`일 때만 렌더. 확정/취소 건엔 버튼 없음.
- 클라이언트 컴포넌트는 기존 `BookingStatusSelect` 패턴 답습
  (useTransition + router.refresh + 인라인 에러, 에러색 `text-brand-600`).
- 네이티브 `confirm()` 사용 — 별도 모달 컴포넌트는 과설계라 제외.

### 5. 확정 건 안내 문구 (추가 구현)
- 사용자 요청으로 `confirmed` 상태 카드에
  "확정된 예약의 취소는 1588-0000으로 전화 상담해주세요." 문구 추가.
- 전화번호는 booking/complete 페이지와 동일한 1588-0000 사용.
- 스타일은 카드 내 기존 보조 텍스트(`text-sm text-neutral-500`)와 통일.
