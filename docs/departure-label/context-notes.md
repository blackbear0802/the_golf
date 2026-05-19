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

## 2026-05-19 (구현·검증 완료)

- 스키마+파서+크롤러+표시 12파일+어드민폼+스크립트 반영. `db push` 운영 적용(비파괴), `npm run build` 통과.
- **회귀 OK:** sample-post.txt(단일 날짜) → departureLabel=null, departureDate 2026-12-08 유지(변화 없음).
- **범위 OK:** 중국 염성 원본("7월~8월", 연도 없음) → departureLabel="7월~8월", departureDate=2026-07-01(연도 버그도 동시 해결, 과거 아님). 라이브 상품 생성·노출 확인.
- **별개 발견:** `normalize`의 `capacity < 1 → null` 가드 때문에 모집인원 미기재 글은 통째로 스킵됨. 날짜 문제와 동일 부류. → 사용자 지시로 "같은 방식" 해결 진행.

## 2026-05-19 (capacityLabel — 날짜와 동일 방식)

- departureLabel과 대칭으로 `capacityLabel String?` 추가. capacity는 정렬/필터/예약용 내부값 유지(미기재 시 0).
- **날짜와 다른 핵심:** capacity는 표시뿐 아니라 **예약 로직**에 쓰임 — `BookingForm` max 인원, `api/bookings` 정원초과 검증. capacity=0을 방치하면 "최대 0명"으로 예약 불가가 됨. 이 사이트 예약은 문의형(상담원 24h 내 연락, 좌석 락 아님)이므로 **capacity<=0 = 상한 없음(상담 시 확정)**으로 처리. BookingForm·api/bookings에서 capacity>0일 때만 상한 적용. (날짜 작업엔 없던 추가 범위 — 정확성상 필수.)
- 표시 폴백: `capacityLabel ?? (capacity>0 ? '최대 N명' : '인원 문의')`.
- 어드민: capacity 필수 해제(미상 허용) + capacityLabel 입력. 의도(미상 허용)와 일관되게 date(어드민 필수 유지)와 달리 capacity는 어드민도 선택화.
- (2026-05-19 후속) 어드민 폼의 '정원(명)' 숫자칸 + '모집인원 표기' 텍스트칸 2개가 혼란(사용자가 값이 어느 칸인지 못 찾음) → **한 칸 텍스트 '정원'으로 통합**. parseProductInput이 입력을 분해: `^\d+\s*명?$`이면 capacity=숫자/label=null, 그 외 텍스트면 capacity=0/label=텍스트. 수정화면 초기값은 `capacityLabel ?? (capacity>0? String : "")`로 라벨 우선 표시. DB(capacity Int + capacityLabel)·정렬·상세표시·크롤/AI 경로는 무변경(어드민 입력 UX만 통합).
- **검증 중 프롬프트 보정:** 초기 룰이 "16명 (선착순)"을 라벨 "선착순"으로 처리(숫자 16 유실 → 정렬·예약상한 손실)하는 퇴행 발견. 룰을 "인원 숫자가 하나라도 있으면 capacity=그 수, 숫자 전혀 없을 때만 capacityLabel"로 강화. 재검증: 회귀(16명→capacity 16, 라벨 null) OK, 핵심(정원 미기재 → 스킵 안 되고 "2인 출발 가능" 라벨) OK. build 통과, db push(비파괴) 완료.
