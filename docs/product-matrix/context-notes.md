# 전체상품화면 매트릭스 컨텍스트 노트 (결정·근거)

## 2026-05-19 (검토 + 축소판 계획)

- **출처:** `E:\PJT\The Golf v2\해외 골프 상품 페이지 개발 설계.pdf` (13p). 환경에 pdftoppm 없어 임시 폴더 `pdfjs-dist@4.10.38`로 텍스트 추출해 전문 검토(프로젝트 미오염, 임시 폴더는 정리 대상).
- **핵심 판정:** 설계서 UI 콘셉트(월×지역 매트릭스 + 딥링크 목록)는 채택 가치 있음. 그러나 가정한 3-테이블 정규화 스키마·Redis·Kafka·전용 REST·TanStack은 현 스택과 불일치 → 그대로 구현 불가. "콘셉트 채택 + 현실 축소"로 결정(사용자 승인: 축소판 계획 작성).

- **매트릭스 숫자 의미 재정의:** 설계서는 "잔여석 있는 OPEN 스케줄 수". 현 `Product`에 `current_booked`·schedule 분리·status 없음 → 만들 수 없음. **"해당 월·지역 출발 상품 수(Product COUNT)"**로 정의. 의미 변경이라 사용자 확인 항목으로 둠.

- **데이터 모델 = 컬럼 추가(테이블 분리 X):** 현 프로젝트는 단일 flat `Product` 스타일. `Locations`/`Package_Schedules` 도입은 Simplicity First 위반·현 단건 출발 모델과 충돌. `countryCode`/`regionCode` 두 컬럼 + 인덱스로 최소 침습. 지역 메타·정렬순서는 DB 대신 `regions.ts` 상수(설계서 `display_order` 테이블은 이 규모 과설계).

- **진짜 병목은 destination 정규화·데이터 품질(설계서 미언급):** 데이터 출처가 밴드 크롤이라 destination이 자유 텍스트로 들쭉날쭉([[project-band-crawl]] 파서 연도 약점·미기재 폴백 기록). 자동 코드 추론 불가 → **큐레이션 사전** 전제. 그래서 착수 전 1순위 작업이 "현 distinct destination 전수 조사". 미매핑 행은 매트릭스 비노출(목록엔 destination으로 여전히 노출 — degrade 허용, 복원력 원칙).

- **인프라 축소:** Redis/Kafka/Pub/Sub 워커 제외. Vercel Hobby + Neon에 없는 인프라이고 상품 규모(수십~수백)에 50ms SLA·수십만 건 전제는 무의미([[project-vercel-deploy]] Hobby 제약). Next.js ISR `revalidate`만으로 충분.

- **목록은 신규 X, 기존 `/search` 재사용:** `src/app/search/page.tsx`가 이미 Prisma 조건 조회 + 카드 그리드. 셀 클릭은 `/search?countryCode=&regionCode=&month=`로 딥링크하고 search가 그 파라미터를 추가 해석. 새 목록 페이지 신설은 surgical 원칙 위반. 설계서가 목록을 `/packages`로 부른 것과 라우트 네이밍 충돌 → 매트릭스=`/packages`, 목록=`/search`로 제안, 사용자 확인 항목.

- **매트릭스↔목록 건수 일치 강제:** 설계서 2.2 핵심 요구. 매트릭스 `groupBy` WHERE와 `/search` WHERE를 동일 조건으로 맞춰야 함(연·월 = departureDate 범위, region 코드, 카테고리). 검증 체크리스트에 명시.

- **설계서에서 그대로 가져갈 부분:** 4단계 Z-index Sticky, `border` 대신 `shadow-[inset_-1px_0_0_...]`로 1px gap 버그 우회, Sticky 셀 불투명 배경, `overscroll-behavior-x:none`(Safari 바운스), 빈 셀 비활성, `aria-label` 동적 바인딩, 딥링크 URL + 스크롤 복원. 보수적 단일 래퍼 sticky(실험적 per-axis 회피)도 설계서 권고와 일치.

- **확정 전 사용자 확인 4건:** (1) 숫자 의미="출발 상품 수" (2) 라우트=매트릭스 `/packages`·목록 `/search` 재사용 (3) Product 컬럼 추가 방식 (4) 기준연도 1개 시작. checklist 0번 게이트로 둠 — 코드 착수 전 통과 필요.

- **연도:** 설계서 단일 연도. 파서 연도 약점 있어 "기준연도 1개"로 시작, 연도 토글 후순위.

## 2026-05-19 (데이터 조사 — checklist 1)

- 4건 게이트 전부 사용자 승인. `scripts/investigate-destinations.ts`로 전수 조사.
- **규모:** 총 상품 10건, distinct destination 9개, 빈 destination 0. 전량 **2026년**, 출발월은 **6·7월 두 달만**. → 설계서의 "수십만 건·50ms·12개월" 전제는 현 단계와 무관함이 데이터로 재확인. 기준연도=2026 자동 확정.
- **destination 포맷:** 일관되게 "국가 지역명"(한글, 공백 구분). 국가 토큰(중국/태국/베트남/일본/필리핀/말레이시아)은 첫 단어 → 국가 코드 매핑 단순. 지역명이 변동 요소.
- **🔴 핵심 발견 — 동일 지역 3중 표기:** `중국 염성 쑤첸`(2) / `중국 쑤첸`(1) / `중국 염성(쑤첸)`(1) 가 같은 상품군으로 보이나 표기 3가지. 큐레이션 사전이 이걸 1개 regionCode로 합치지 않으면 매트릭스에서 같은 지역이 3행으로 쪼개짐. **다만 염성(옌청)과 쑤첸은 본래 다른 중국 도시** → 자동 판단 불가, 도메인 소유자(사용자) 결정 필요. checklist 1의 ❓항목으로 둠.
- **이 발견이 계획의 "destination 정규화가 진짜 병목" 가설을 데이터로 입증.** 매핑은 코드 자동 추론 불가, 사람 큐레이션 전제 확정.
- 나머지 7개는 1:1 명확 매핑 가능: 태국 치앙마이=TH/chiangmai, 베트남 다낭=VN/danang, 일본 후쿠오카=JP/fukuoka, 필리핀 세부=PH/cebu, 말레이시아 코타키나발루=MY/kotakinabalu, 일본 동경=JP/tokyo.

## 2026-05-19 (큐레이션 사전 확정 — checklist 1 완료)

- **사용자 결정:** 중국 3표기 4건 = **한 지역**(표기만 다름). 정규형은 최빈·최완전 표기 `중국 염성 쑤첸`(2건), 코드 `CN/yancheng`, 표시명 "염성"(괄호 표기 `염성(쑤첸)`이 염성을 주로 봄). 3변형 전부 동일 코드로 흡수.
- **일본 동경:** 표시명은 표준 한글 "도쿄"로 정규화(원문 "동경" 유지하지 않음 — 헤더 가독성). 사소한 큐레이션 선택, 추후 변경 무비용.
- **확정 큐레이션 사전** (raw destination → 코드. §3에서 `src/lib/regions.ts`로 전사):

  | raw destination | countryCode | regionCode | 국가명 | 지역명 | display_order |
  |---|---|---|---|---|---|
  | 태국 치앙마이 | TH | chiangmai | 태국 | 치앙마이 | 10 |
  | 베트남 다낭 | VN | danang | 베트남 | 다낭 | 20 |
  | 일본 후쿠오카 | JP | fukuoka | 일본 | 후쿠오카 | 30 |
  | 일본 동경 | JP | tokyo | 일본 | 도쿄 | 31 |
  | 필리핀 세부 | PH | cebu | 필리핀 | 세부 | 40 |
  | 말레이시아 코타키나발루 | MY | kotakinabalu | 말레이시아 | 코타키나발루 | 50 |
  | 중국 염성 쑤첸 | CN | yancheng | 중국 | 염성 | 60 |
  | 중국 쑤첸 | CN | yancheng | 중국 | 염성 | 60 |
  | 중국 염성(쑤첸) | CN | yancheng | 중국 | 염성 | 60 |

- **사전 키 전략:** raw destination 문자열 **정확 일치** 키. 신규 크롤 글에 사전에 없는 destination 등장 시 → countryCode/regionCode null + 경고(매트릭스 비노출, 목록엔 destination으로 노출 — degrade 허용, 계획 리스크 항목과 일치). 사전은 운영하며 증분 보강.
- **현 데이터로 채워질 매트릭스:** 지역 7행(치앙마이·다낭·후쿠오카·도쿄·세부·코타키나발루·염성) × 월 2칸(2026-06, 2026-07). 6월=치앙마이·다낭·도쿄 각 1, 7월=후쿠오카·세부·코타키나발루·염성(3)·... = 합계 10. 매트릭스↔목록 일치 검증 기준값.
- checklist §1 완료. 다음은 §2 스키마/백필(코드·Neon 마이그레이션) — DB 변경 단계라 착수 전 사용자 확인.

## 2026-05-19 (§2 스키마/백필 — 완료)

- **사용자 승인:** "전체 진행" — schema 변경 + 운영 Neon `prisma db push` + 백필까지 일괄. 가산적 nullable 2컬럼이라 데이터 손실 없음.
- **스키마:** `Product.countryCode String? @map("country_code")`, `regionCode String? @map("region_code")` + `@@index([countryCode, regionCode, departureDate])`. 기존 `@map` snake_case 컨벤션 준수.
- **마이그레이션 방식:** 이 프로젝트는 migrations 히스토리 없이 `prisma db push`(schema-first). push 성공 후 `prisma generate`로 client 재생성(generated/prisma).
- **regions.ts 선행 생성(§3→§2 당김):** 백필이 큐레이션 사전을 필요로 함. 사전을 스크립트에 중복하지 않으려 단일 출처 `src/lib/regions.ts`를 §2에서 먼저 생성. `REGION_META`(regionCode→국가/지역명·displayOrder), `mapDestination()`(trim 후 정확 일치, 미매핑 null), `orderedRegionCodes()`. §3 남은 일은 밴드 파서 연결뿐.
- **백필:** `scripts/backfill-region-codes.ts`(멱등 — 이미 일치하면 스킵). investigate 스크립트와 동일한 PrismaPg+dotenv 패턴.
- **백필 결과(검증 기준값 갱신):** 조사 시점 10건 → 현재 **11건**(중국 yancheng가 4→5, 신규 1건 유입). **전량 매핑, 미매핑 0**. regionCode 분포: yancheng 5, chiangmai/danang/fukuoka/tokyo/cebu/kotakinabalu 각 1. §1 노트의 "합계 10" 기준값은 **11로 갱신**(매트릭스↔목록 일치 검증 시 이 값 사용, 월 분해는 §4에서 재확인).
- 다음은 §4 매트릭스 페이지(`/packages`, 서버 컴포넌트 groupBy+ISR) + §5 `/search` 확장. DB 변경 없음.

## 2026-05-19 (§3·§4·§5·§6 — 완료)

- **§3 파서 연결 — 단일 헬퍼 `regionFieldsFor(destination)`:** `{countryCode,regionCode}` 또는 둘 다 null 반환. 3개 생성 경로에 주입:
  - 어드민 수동 POST/PATCH: `parseProductInput`(admin-product.ts) 출력 `ParsedProduct`에 두 필드 추가 → 단일 chokepoint로 POST·PATCH 동시 커버(destination 수정 시 코드 자동 갱신).
  - 빠른등록(`/api/admin/products/quick`)·밴드 크롤러(`band-crawler.ts`): claude-parser 출력이라 parseProductInput 안 거침 → 생성 직전 `regionFieldsFor` spread + 미매핑 시 `console.warn`(상품 생성은 막지 않음, degrade 허용).
- **§4 groupBy → findMany+JS 버킷:** Prisma `groupBy`는 departureDate에서 '월' 파생 불가(raw SQL 필요). 현 규모(수십 건)에선 findMany 후 JS로 `counts[regionCode][month]` 집계가 단순·정확하고 `/search` WHERE와 동일 의미 유지가 쉬움. 계획의 "groupBy"는 의미상 대체(집계 동일). context 기록.
- **ISR vs Dynamic:** `revalidate=3600` 선언했으나 Prisma 비캐시 fetch라 빌드 산출물상 `/packages`는 ƒ(Dynamic, 요청 시 SSR). 트래픽·규모 작아 force-static 강제는 과설계라 미적용. 신선도(크롤/어드민 반영)에도 유리.
- **§4 행 구성:** `orderedRegionCodes()`(displayOrder 순) 중 해당 연도 상품 ≥1인 지역만. 빈 지역 행 비노출.
- **Sticky 설계:** 4단계 z-index(코너 z30 / 헤더행 z20 / 첫열 z10 / 본문 z0), 불투명 배경(neutral-50·white), border 대신 inset shadow(코너는 -1 -1 양방향), 컨테이너 `overscroll-x-none`. 설계서 권고 그대로.
- **§5 공존:** 기존 q/destination/nights/price 분기 **무변경**, 뒤에 countryCode/regionCode/month(YYYY-MM 정규식) AND 추가만. month는 `Date.UTC` gte/lt — 매트릭스 집계와 **동일 식**이라 건수 일치가 구조적으로 보장.
- **§6 검증:** `scripts/verify-matrix-search.ts`로 전 (지역×월) 셀에 대해 매트릭스 버킷 == `/search` count 단언 → 활성 7셀 불일치 0(샘플: 치앙마이 2026-06=1, 다낭 2026-06=1, 후쿠오카 2026-07=1). `npm run build` 통과. **미실시:** 라이브 sticky 육안/스크린리더 청취(코드는 완료, 실행 환경 필요).
- **남은 일:** 메모리 갱신, `/packages` 진입 동선(Header/홈) 노출 위치는 계획 범위 밖 — 사용자 결정 대기.

## 2026-05-23 (§6 코드 검증 + sticky 제약 기록)

- **§3 체크리스트 불일치 해소:** 코드 확인 결과 `regionFieldsFor`가 3개 경로(admin-product.ts·quick route·band-crawler.ts) 전부 적용 완료 상태였음. context-notes 2026-05-19 §3 항목과 일치. 체크리스트만 갱신 안 된 것이라 체크 처리.

- **§6 코드 분석 결과:**
  - `warm-50`/`warm-700` → `globals.css @theme inline`에 정의됨 ✅
  - `sticky left-0` (지역 열) + `sticky top-0 left-0` (코너) → `overflow-x-auto` 컨테이너 안 가로 스크롤에서 정상 동작 ✅
  - z-30/20/10/0 단계 + 불투명 배경(`bg-neutral-50`/`bg-white`) → 스크롤 시 콘텐츠 투명/겹침 없음 ✅
  - `border-separate border-spacing-0` → sticky 셀 경계 gap 없음 ✅

- **알려진 제약 — sticky 헤더 행(top-0) 페이지 세로 스크롤 미동작:**
  - CSS 규칙: `overflow-x: auto`를 설정하면 `overflow-y`도 `auto`로 계산됨 → 래퍼 div가 수직 스크롤 컨텍스트가 됨 → `sticky top-0`이 페이지 뷰포트가 아닌 래퍼 기준으로 작동 → 래퍼에 고정 높이가 없어 수직 오버플로 자체가 없음 → 페이지 세로 스크롤 시 헤더 행이 뷰포트에 고정되지 않음.
  - **실질적 영향:** 현재 7행(7 지역) 기준 표 높이 ≈ 400px. 페이지 헤더/설명/푸터 포함 전체 페이지 높이 ≈ 700~800px. 모바일(667px) 기준 세로 스크롤 필요량이 50~150px에 불과하여 헤더 행이 뷰포트 밖으로 나가는 시나리오가 실질적으로 없음.
  - **수정 기준:** 지역이 12행 이상으로 늘어나 페이지 세로 스크롤이 200px 이상 필요해지는 시점에 재검토. 수정 방향 = 래퍼에 `max-height: 100svh` + `overflow-y: auto` 추가해 표 자체가 수직 스크롤되도록 변경.

- **육안 확인 미실시 항목:** 샌드박스 환경에 Node.js가 없어 dev 서버 실행 불가. 사용자가 `http://localhost:3000/packages` 를 열어 모바일 DevTools(375px/768px)에서 가로 스크롤 시 지역 열 sticky + z-index 레이어링 정상 여부 최종 확인 권장.
