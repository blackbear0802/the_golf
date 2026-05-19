# 전체상품화면 — 월×지역 교차 매트릭스 (축소판) 계획

## 배경 / 문제
설계서(`E:\PJT\The Golf v2\해외 골프 상품 페이지 개발 설계.pdf`)는 "월(가로)×국가-지역(세로) 교차 매트릭스 + 셀 클릭 시 필터된 목록 진입"을 제안. 콘셉트는 이 서비스에 적합하나, 문서가 가정한 데이터 모델·인프라가 현 프로젝트와 어긋남 → 그대로 구현 불가. 본 계획은 콘셉트만 채택하고 현 스택(Next.js 14 App Router · Neon · Prisma · Vercel Hobby)에 맞춰 대폭 축소한다.

## 설계서 vs 현실 (축소 근거)
| 설계서 가정 | 현실(`schema.prisma`) | 축소 결정 |
|---|---|---|
| `Locations` 정규화 테이블, country/region 코드 | `Product.destination` 자유 텍스트 1칸 | Product에 `countryCode`/`regionCode` 컬럼 추가(새 테이블 X) |
| 상품 1:N `Package_Schedules` (다중 출발일) | `Product.departureDate` 단건 | 상품=출발 1건 그대로. 매트릭스 숫자=상품 COUNT |
| `total_capacity`−`current_booked` 잔여석 | `current_booked` 없음 | 매트릭스 숫자 의미를 **"해당 월·지역 출발 상품 수"**로 정의(조인 가용 X) |
| Redis + Kafka 캐시 무효화 | 해당 인프라 없음 | Next.js ISR `revalidate`만 |
| 전용 `/api/v1/...` 집계 API | App Router 서버 컴포넌트 | 서버 컴포넌트에서 Prisma `groupBy` 직접 |
| TanStack Table | — | 정적 grid + Tailwind sticky |

## 목표 (사용자 승인: 축소판 계획 작성)
1. 현 `Product`에 `countryCode`/`regionCode` 추가 + 밴드 파서가 destination→코드 매핑, 기존 행 백필.
2. 매트릭스 페이지: 월(1~12)×(국가-지역) 그리드, 셀=해당 월·지역 출발 상품 수, 4단계 Sticky.
3. 셀 클릭 → 기존 `/search`에 `countryCode`·`regionCode`·`month` 쿼리로 딥링크(목록 페이지 신규 X, 재사용).
4. 접근성(`aria-label`)·딥링크 URL·스크롤 복원은 설계서대로 채택.

## 핵심 제약 → 설계
- **데이터 품질이 진짜 병목**(설계서 미언급). destination이 크롤 자유 텍스트("베트남 다낭", "다낭/호이안" 등)라 코드 매핑은 **큐레이션 사전**(코드 내 상수 맵)으로 처리. 매핑 실패 값은 매트릭스에서 제외 + 어드민 경고(복원력 원칙, [[project-band-crawl]]).
- 지역 메타(국가명·지역명·정렬순서)는 DB 테이블 대신 **코드 상수**(`display_order`용 별도 테이블은 이 규모에 과설계).
- 매트릭스 숫자와 목록 결과 건수는 **동일 WHERE 조건**으로 일치 강제(설계서 2.2 요구).

## 구성 (구현 시)
- 스키마: `Product.countryCode String?`, `Product.regionCode String?` + 인덱스 `(countryCode, regionCode, departureDate)`. 마이그레이션.
- 상수: `src/lib/regions.ts` — countryCode→국가명, regionCode→지역명·정렬순서, destination 텍스트→코드 큐레이션 맵.
- 파서: 밴드 크롤 파서(`parseProduct` 경로)에서 destination→code 매핑 채움. 기존 행 백필 스크립트(1회).
- 페이지: `src/app/packages/page.tsx`(매트릭스, 서버 컴포넌트, `groupBy`+ISR).
- 컴포넌트: `src/components/MatrixGrid.tsx` — 4단계 Z-index Sticky, 빈 셀 비활성, `aria-label`, 셀=`<a href="/search?...">`.
- `/search` 확장: `countryCode`·`regionCode`·`month`(YYYY-MM) 쿼리 파라미터 해석 추가(기존 destination/nights/price 필터와 공존).

## 재사용 (무변경 지향)
기존 `/search` 목록 페이지·`ProductCard`·`SearchFilters`. 파서 파이프라인(`parseProduct`)에 매핑 한 줄 추가. ISR은 Next.js 내장.

## 비목표
- Redis/Kafka/Pub/Sub 캐시 워커, 전용 REST 집계 API, TanStack Table, 시각적 회귀(Cypress/Playwright) — 전부 제외.
- 다중 출발일(Package_Schedules) 정규화 — 현 단건 모델 유지.
- 초개인화·히트맵·소진율 컬러(설계서 10장 향후 항목) — 범위 외.
- 실험적 per-axis sticky — 보수적 단일 래퍼 방식 채택(설계서 권고와 일치).

## 리스크 / 결정 (확정 전 사용자 확인 필요 표시)
- **destination→코드 매핑은 큐레이션이 전제.** 자동 추론 불가(텍스트 들쭉날쭉). 1차 작업=현 distinct destination 전수 조사 후 사전 작성. 미매핑 행은 매트릭스 비노출(목록엔 destination 필터로 여전히 노출됨 — degrade 허용).
- **(❓확인)** 매트릭스 페이지 라우트: 설계서는 목록을 `/packages`라 부르나 본 계획은 매트릭스=`/packages`, 목록=기존 `/search` 재사용으로 제안. 라우트명·재사용 여부 사용자 확인.
- **(❓확인)** `countryCode`/`regionCode`를 Product 컬럼으로 추가 vs 별도 `Region` 테이블. 본 계획은 컬럼 추가(현 단일 테이블 스타일·Simplicity First). 향후 지역 메타가 커지면 테이블 분리.
- **(❓확인)** 매트릭스 숫자 정의를 "해당 월·지역 출발 상품 수"로 고정해도 되는지(설계서의 "조인 가능 수"와 다름 — 현 스키마엔 잔여석 개념 없음).
- 연도 범위: 설계서는 단일 연도(2026). 파서 연도 약점([[project-band-crawl]]) 있으니 매트릭스는 "기준연도 1개"로 시작, 연도 토글은 후순위.
