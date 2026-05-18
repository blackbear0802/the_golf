# 출발 일정 라벨(departureLabel) 도입 계획

## 배경 / 문제
밴드 게시글의 일정이 "7월~8월", "6월 중 매주 출발"처럼 **단일 날짜가 아닌 범위/느슨한 표현**으로만 오는 경우가 흔하다. 현재 `Product.departureDate`는 `DateTime @db.Date` 필수 단일값이라:
- 파서가 날짜 못 찾으면 `null` 반환 → 그 글 통째로 스킵
- 범위면 억지 단일 날짜(과거 연도 추정 버그 포함)

요구사항: 범위/느슨한 일정은 **원문 그대로 보존·표시**한다.

## 결정된 방식 (사용자 승인: Option A)
- `Product.departureLabel String?` 신설 — 화면에 그대로 보여줄 사람 친화 문자열(예: "2026년 7월~8월").
- `departureDate DateTime`는 **유지**(필수). 범위일 땐 정렬/인덱스/날짜연산용 **내부 근사 시작일**(범위 시작, 연도 누락 시 현재연도 기준). 사용자에겐 노출 안 함.
- 표시 규칙: `departureLabel ?? formatDate(departureDate)` — 라벨 있으면 라벨, 없으면 기존대로.
- 정렬·복합인덱스·`.getTime()`·`daysUntil`·예약 복사·어드민 날짜 입력은 전부 `departureDate` 그대로 → **무파괴**.

## 영향 범위
- 스키마: `prisma/schema.prisma` + `prisma db push`(운영 DB, nullable 컬럼 추가=비파괴) + `prisma generate`
- 파서: `src/lib/claude-parser.ts` (필드/프롬프트/연도 컨텍스트)
- 크롤러: `src/lib/band-crawler.ts` (product.create에 departureLabel)
- 표시: 상품상세, OG이미지, 검색카드, AI챗카드, 예약 2종, 마이페이지, 어드민 목록 (`departureLabel ?? formatDate(...)` 인라인 — 공용 유틸 없는 하우스 스타일 유지)
- 어드민 입력: `ProductForm.tsx` + 생성/수정 API + edit 매핑 (라벨 수동 보정 가능하게)
- 테스트 스크립트: `scripts/test-parse-pipeline.ts`

## 비목표
- `departureDate`의 문자열화/널러블화 안 함(파급 큼, 사용자 미선택).
- 공용 formatDate 유틸 리팩터 안 함(하우스 스타일 = 파일별 로컬).
- 기존 라이브 테스트 상품 2건 보정은 별건(요청 시).

## 리스크
- 운영 DB 스키마 변경: nullable 추가라 비파괴지만 `db push`는 사용자 승인/실행 권장.
- 파서 프롬프트 변경이 기존 단일 날짜 추출 회귀 유발 가능 → 기존 샘플로 회귀 확인 필수.
