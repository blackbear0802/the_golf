# departureLabel 체크리스트

## 1. 스키마
- [x] `prisma/schema.prisma` Product에 `departureLabel String? @map("departure_label")` 추가
- [x] `npm run db:push` (운영 DB, 사용자 승인 후) → `prisma generate`
- [x] 기존 행 departureLabel=NULL 확인(폴백 동작)

## 2. 파서
- [x] `ParsedProductFields`에 `departureLabel: string | null` 추가
- [x] SYSTEM_PROMPT: departureLabel 규칙 + departureDate=근사 시작일 규칙 명시
- [x] 현재 연도 컨텍스트 주입(연도 누락 → 과거날짜 버그 방지)
- [x] 정확 단일 날짜 글은 departureLabel=null 유지(회귀 없음)

## 3. 크롤러 / 스크립트
- [x] `band-crawler.ts` product.create에 `departureLabel`
- [x] `scripts/test-parse-pipeline.ts` 출력 + create에 반영

## 4. 표시 (departureLabel ?? formatDate(departureDate))
- [x] `products/[id]/page.tsx`
- [x] `products/[id]/opengraph-image.tsx`
- [x] `search/page.tsx` + 검색 카드 컴포넌트(라벨 전달·렌더)
- [x] `components/chat/ChatMessage.tsx` 카드
- [x] `booking/[id]/page.tsx`, `booking/complete/page.tsx`
- [x] `my/page.tsx` (표시만, 정렬/getTime은 그대로)
- [x] `admin/products/page.tsx`, `admin/bookings/page.tsx`

## 5. 어드민 입력
- [x] `ProductForm.tsx` 선택 입력 필드 추가(출발 일정 텍스트, 선택)
- [x] 생성/수정 API route 처리 확인·추가
- [x] `admin/products/[id]/edit` 매핑

## 6. 검증
- [x] 기존 sample-post.txt 회귀(단일 날짜 → 라벨 null, 날짜 정상)
- [x] 범위 케이스(중국 염성 "7월~8월") → label 세팅 + 근사일 비과거
- [x] `npm run build` 통과
- [x] dry-run/commit로 라이브 상품에 라벨 노출 확인
