# Context Notes — 시니어 골프 투어 플랫폼

CEO Review + 스펙 정의 세션 (2026-05-11) 에서 확정된 결정들.

---

## 아키텍처 결정

### 모놀리식 MVP
MSA 없음. Next.js (프론트 + API Routes) + PostgreSQL + Slack Webhook.
배포: Vercel + Supabase. Phase 1에서 단일 서비스, 단일 DB.

### Supabase Connection Pooling
배포 전 PgBouncer 트랜잭션 풀링 설정 필수.
Supabase Settings → Database → Connection Pooling → Transaction mode URL 사용.

---

## 상품 데이터 (Products 테이블)

네이버 밴드 크롤링 → LLM 추출 → 구조화 저장.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| destination | text | 목적지 |
| golf_course | text | 골프장명 |
| departure_date | date | 출발일 |
| nights | int | 박수 |
| price | int | 원화 기준 |
| included | text[] | 포함 사항 |
| excluded | text[] | 불포함 사항 |
| capacity | int | 모집 인원 |
| deadline | date | 마감일 |
| source_url | text | 원본 밴드 게시글 URL |
| raw_text | text | 원문 전체 (재파싱 대비) |

**추출 주의사항.** 여행사마다 형식이 다름. LLM 추출 프롬프트에 few-shot 예시 충분히 포함해야 파싱 실패율 낮아짐. 특히 가격(만원/원/달러 혼용), 날짜(10/15, 10월 15일, 26.10.15) 변형 커버 필요.

---

## CUI 아키텍처

LLM 기반 (rule-based 아님). Function Calling 방식.

```
사용자 자연어 입력
    → LLM API (Claude/GPT — 미확정)
    → function calling: search_products(destination, headcount, nights, date)
    → products DB 조회
    → 매칭 상품 반환
    → LLM이 자연어로 설명 + 상품 카드 렌더링
```

**LLM 벤더: Claude API (Anthropic)**
- Tool Use 기능으로 search_products function calling 구현
- 프롬프트 캐싱 활용 → 시스템 프롬프트 반복 비용 절감
- 한국어 성능 우수, 컨텍스트 윈도우 200K 토큰

**개인정보 주의.** 사용자 대화 내용이 Anthropic 서버로 전송됨. 개인정보 처리방침에 명시 필요. Anthropic DPA(데이터 처리 계약) 확인 및 PIPA 준수 여부 검토 필요.

---

## 예약 홀딩 폼

**플로우:**
1. 예약 버튼 클릭 → 회원 여부 확인
2. 회원 → 로그인 → 회원 정보 자동 채움
3. 비회원 → 회원가입 유도 → 가입 후 자동 채움
4. 나머지 필드 직접 입력 → 제출 → Slack 알림

**자동 채움 (카카오 로그인에서):**
- 이름
- 전화번호
- 이메일

**직접 입력:**
- 희망 출발일
- 희망 박수
- 인원
- 추가 요청사항

**수집 안 함:**
- 여권 정보 → 유선 상담으로 별도 수집

---

## Slack 알림 실패 처리

Slack Webhook 실패 시 조용한 실패 방지.
예약 홀딩 완료 후 화면에 표시:
> "상담원이 24시간 내 연락드립니다. 연락이 없으시면 [전화번호]로 연락주세요."

---

## MVP 범위 (확정)

**포함:**
- 카카오 소셜 로그인
- LLM 기반 CUI (Function Calling)
- 네이버 밴드 크롤링 + LLM 추출 (AI-01, AI-02)
- 상품 카드 UI
- 예약 홀딩 폼 → Slack 알림 → 상담원 전화 확정
- Supabase Connection Pooling

**제외 (TODOS.md 참고):**
- STT 음성 입력
- RAG/벡터 DB
- 카카오페이 분할 결제
- 마이페이지
- 날씨 알림
- 다이내믹 패키징
- 광고 엔진
- MSA

---

## UI 설계 방향 (2026-05-11)

### 모바일 퍼스트

Tailwind 기본 스타일 = 모바일, md: 이상에서 PC 레이아웃으로 확장.

**모바일 레이아웃:**
- CUI 입력창: 화면 하단 고정 (카카오톡 스타일)
- 상품 카드: 세로 단일 컬럼 스택
- 버튼/터치 영역: 최소 44px
- 기본 폰트: 16px (50대 가독성)

**PC 레이아웃 (md: 768px 이상):**
- 왼쪽: 채팅 영역
- 오른쪽: 상품 카드 목록

**적용 범위:** FE-01(CUI), FE-02(상품카드), FE-03(예약폼) 전부 모바일 퍼스트 기준으로 설계.

---

## 엔지니어링 리뷰 결정 (2026-05-11)

### DB 스키마 (Phase 1 확정)

Phase 1에서 생성할 테이블 6개만 마이그레이션. P2/P3 테이블은 해당 Phase 진입 시 추가.

```
users           → 카카오 OAuth 사용자
products        → 크롤링 + LLM 추출 상품
band_crawled_data → 원본 크롤링 데이터 (processed: enum)
bookings        → 예약 홀딩
chat_sessions   → 채팅 세션 (chat_logs 대체)
chat_messages   → 개별 메시지 (role: user|assistant)
```

`band_crawled_data.processed` 컬럼: `enum('pending', 'in_progress', 'done', 'failed')`.
Edge Function 타임아웃 후 재실행 시 `in_progress` 레코드 복구 처리 필요.

### 크롤링 스케줄러

**Supabase Edge Functions + pg_cron** 방식 채택.
- pg_cron이 스케줄링
- Edge Function이 실제 크롤링 + LLM 추출 실행
- 추가 서버 불필요, Supabase 인프라 내 완결

### JWT 토큰 저장

**HttpOnly Cookie + SameSite=Strict** 방식.
- XSS 방어: 자바스크립트에서 토큰 읽기 불가
- CSRF 방어: SameSite=Strict 자동 처리
- Next.js API Routes에서 `Set-Cookie` 헤더로 발급

### CUI 보안

1. 입력 최대 500자 제한 (API Route)
2. 시스템 프롬프트에 프롬프트 인젝션 방어 문구 삽입
3. `search_products` 파라미터 유효성 검사 (API Route)
4. 사용자당 rate limit: 분당 10회, 일당 100회 (Supabase `rate_limits` 테이블)

### 채팅 저장 구조

`chat_logs.messages[]` JSON 배열 → `chat_sessions` + `chat_messages` 분리.
"최근 N개 메시지만 컨텍스트 전달"이 `LIMIT N` 쿼리 한 줄로 가능.

### 성능

- products 테이블 복합 인덱스: `(destination, departure_date, capacity, nights)`
- Slack Webhook: fire-and-forget (동기 await 금지)
- Claude API 프롬프트 캐싱: 시스템 프롬프트에 `cache_control: ephemeral` 적용

### 코드 구조

중복 모듈 정리: AD-01=AI-01(크롤러), AD-02=AI-02(LLM 추출). 단일 구현체 사용.
AD-03 엑셀 업로드 모듈: 제거. 명세서에서 deprecated 표시 필요.

---

## 미결 사항

- [x] LLM API 벤더: Claude API (Anthropic) 확정
- [ ] 상담원 운영 SLA 확정 (누가, 몇 명, 어떤 시간대)
- [ ] 네이버 밴드 파트너십 계약 (크롤링 전 필수)
- [ ] 수익 모델 확정 (거래 수수료 vs SaaS vs 광고)
