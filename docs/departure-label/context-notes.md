# departureLabel 컨텍스트 노트 (결정·근거)

추가되는 결정은 계속 여기 append.

## 2026-05-18

- **방식 = Option A (사용자 승인).** departureDate를 문자열/널러블로 바꾸는 안은 정렬·복합인덱스(`@@index([destination, departureDate, capacity, nights])`)·`my/page` 의 `.getTime()`/`daysUntil`·예약 복사·어드민 date input 전부를 깨므로 기각. 표시용 라벨 분리가 파급 최소.
- **departureDate 의미 재정의:** 라벨 있는 상품에선 departureDate가 "사용자에게 안 보이는 내부 정렬 키"(범위 시작 근사). 화면 노출 0이므로 근사값이어도 무방.
- **공용 유틸 안 만듦:** 코드베이스가 파일마다 로컬 `formatDate`를 두는 스타일(공용 util 부재). 새 공용 모듈 도입은 하우스 스타일 위반이라 각 표시 지점에 `product.departureLabel ?? formatDate(product.departureDate)` 인라인. (단점: 중복. 채택 이유: CLAUDE.md surgical/match-existing-style 우선.)
- **연도 누락 버그 동시 대응:** 파일1에서 본문 사진캡션 "2025년 8월"에 끌려 출발을 2025로 추정한 사례 확인. 파서 프롬프트에 현재 연도 컨텍스트를 넣어 "연도 미상 → 과거 추정"을 막는다. 이는 라벨 도입과 한 묶음(범위는 보통 연도도 누락).
- **운영 DB 직접 변경:** migrations 폴더 없음 → `prisma db push`만 사용. nullable 컬럼 추가는 비파괴(기존행 NULL→폴백)지만 prod 대상이라 push는 사용자 승인/실행로 진행.
- **기존 라이브 테스트 상품 2건**(`cmpauqbmw...`, `cmpauqfht...`): 이번 작업 후 원하면 중국건을 "2026년 7월~8월" 라벨로 보정 가능 — 별건으로 둠.
- **회귀 가드:** 파서 프롬프트 변경 위험 → 기존 `scripts/sample-post.txt`(정확 단일 날짜) 결과가 departureLabel=null·기존 날짜 그대로인지 반드시 재확인.
