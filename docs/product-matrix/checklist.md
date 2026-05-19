# 전체상품화면 매트릭스 체크리스트 (축소판)

> 코드 착수 전. 0번(확인)·1번(데이터 조사)이 선행 게이트.

## 0. 사용자 확인 (착수 전 게이트)
- [x] 매트릭스 숫자 정의 = "해당 월·지역 **출발 상품 수**"(조인 가용 X) 승인
- [x] 라우트안: 매트릭스=`/packages`, 목록=기존 `/search` 재사용 승인
- [x] `countryCode`/`regionCode` = Product 컬럼 추가(별도 테이블 X) 승인
- [x] 기준연도 1개로 시작(연도 토글 후순위) 승인 → **2026 확정**(데이터 전량 2026)

## 1. 데이터 조사 (큐레이션 선행)
- [x] 현 `Product.destination` distinct 값 전수 조사 → `scripts/investigate-destinations.ts`. 총 10건/9 distinct, 빈 값 0
- [x] distinct별 출발월 분포 확인 → 전량 2026, **6·7월만** 데이터 존재(2개월)
- [x] **(사용자)** 중국 3표기 4건 = **한 지역**(표기만 다름) 확정 → `CN/yancheng`로 합침
- [x] 국가/지역 코드 체계 확정(ISO alpha-2 + region slug) → 큐레이션 사전 context-notes에 확정(§3에서 `regions.ts`로 전사)

## 2. 스키마 / 백필
- [x] `prisma/schema.prisma`: `Product.countryCode String?`, `regionCode String?`
- [x] 인덱스 `@@index([countryCode, regionCode, departureDate])`
- [x] 마이그레이션 생성·적용(Neon) → `prisma db push` 성공, client 재생성
- [x] 기존 행 백필 스크립트 `scripts/backfill-region-codes.ts`(멱등)
- [x] 백필 결과 검증 → 11건 전량 매핑, 미매핑 0건 (yancheng 5·나머지 6지역 각 1)

## 3. 상수 / 파서
- [x] `src/lib/regions.ts` — country/region 라벨·정렬순서·destination 큐레이션 맵 + 헤더 코멘트 (§2 백필이 import하므로 선행 생성)
- [ ] 밴드 파서 경로에서 destination→`countryCode`/`regionCode` 채움(기존 destination 무변경, 추가만)
- [ ] 매핑 실패 시 null + 경고 로깅(상품 생성은 막지 않음)

## 4. 매트릭스 페이지
- [ ] `src/app/packages/page.tsx` — 서버 컴포넌트, Prisma `groupBy`(연·월×region), ISR `revalidate`
- [ ] `src/components/MatrixGrid.tsx` — 12열 grid, 4단계 Z-index Sticky
- [ ] Sticky 함정 대응: 불투명 배경, `border` 대신 `shadow-[inset...]`, `overscroll-behavior-x:none`
- [ ] 빈 셀 비활성(커서·클릭 차단·옅은 회색), 활성 셀 브랜드색 + hover
- [ ] 활성 셀 `<a href="/search?countryCode=..&regionCode=..&month=YYYY-MM">` + 동적 `aria-label`
- [ ] 스크롤 복원(라우팅 단)

## 5. /search 확장 (재사용)
- [ ] `countryCode`·`regionCode`·`month` 쿼리 파라미터 해석 추가
- [ ] 기존 destination/nights/price 필터와 공존(회귀 없음)
- [ ] 매트릭스 셀 숫자 = `/search` 결과 건수 **정확 일치** 확인(동일 WHERE)

## 6. 검증
- [ ] `npm run build` 통과
- [ ] 매트릭스 숫자 ↔ 셀 클릭 후 `/search` 건수 일치(샘플 3셀)
- [ ] 빈 셀 클릭 불가·활성 셀만 링크
- [ ] 모바일(375)·태블릿(768)·데스크톱 가로/세로 스크롤 시 4겹 헤더 안 무너짐
- [ ] 스크린리더 셀 `aria-label` 문맥 읽힘
- [ ] `/search` 기존 진입(destination 등) 회귀 없음

## 7. 마무리
- [ ] context-notes 결정·근거 기록
- [ ] 메모리 갱신([[project-progress]] 매트릭스 추가, [[project-band-crawl]] destination 코드화 메모)
