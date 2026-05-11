# TODOS — 시니어 골프 투어 플랫폼

CEO Review (plan-ceo-review) 결과로 생성. 2026-05-11.

---

## P1 — Phase 1 전에 반드시 해결

### [ ] 네이버 밴드 파트너십 계약 체결
**What:** 크롤링 대상 밴드 운영자(여행사)와 공식 제휴 계약 + 데이터 수집 동의 확보  
**Why:** 제휴 없이 크롤링하면 네이버 밴드 약관 위반 → 서비스 중단 리스크  
**Context:** Phase 1에서 네이버 밴드 크롤링을 주 상품 데이터 소스로 사용. 법적 근거 없이 크롤링 시작하면 MVP 론칭 후 강제 중단될 수 있음. 계약 협상 → 크롤링 → MVP 순서가 맞는 타임라인.  
**Effort:** M (인간 팀 기준) — 법무 검토 포함  
**Priority:** P1  
**Blocked by:** 없음 (즉시 시작 가능)

### [ ] 상담원 운영 SLA 정의
**What:** "24시간 내 연락" 약속을 위한 운영 모델 확정  
**Why:** 사용자에게 24시간 연락을 약속하고 이행 못 하면 첫 인상에서 신뢰가 무너짐  
**Context:** Phase 1 예약 홀딩 완료 후 사용자에게 "상담원이 24시간 내 연락드립니다" 안내 노출. 실제 담당자가 누구인지, 업무 시간이 언제인지, 몇 건까지 처리 가능한지 확정해야 Slack 알림 체계가 의미 있음.  
**Questions to resolve:**
- 담당자: 창업자 직접? 전담 직원?
- 운영 시간: 9-6시 평일만? 주말 포함?
- 용량: 하루 최대 몇 건?
- 초과 시: 대기 안내? 자동 거절?  
**Effort:** S  
**Priority:** P1  
**Blocked by:** 없음

### [ ] LLM 추출 품질 Eval 파이프라인 구축
**What:** 실제 네이버 밴드 게시글 샘플 20개로 정답셋 구성, Claude 추출 결과와 비교하는 eval 스크립트  
**Why:** 가격/날짜/박수 형식이 다양해 파싱 실패율이 핵심 데이터 품질 지표. 자동화된 검증 없이는 배포 후 조용히 틀린 데이터가 쌓임  
**How to start:** `scripts/eval-extraction.ts` 작성 → 샘플 JSON 정답셋 → Claude API 호출 → 비교 결과 출력  
**Effort:** S (2시간)  
**Priority:** P1  
**Blocked by:** 실제 밴드 게시글 샘플 확보

### [ ] Supabase Connection Pooling 설정
**What:** Supabase의 직접 연결(Direct Connection) 대신 PgBouncer 트랜잭션 풀링 사용  
**Why:** Supabase 무료/소규모 티어는 직접 연결 수 제한. 서버리스 함수는 요청마다 새 연결을 생성해 한도 초과 시 DB 거부 발생  
**Context:** Vercel + Supabase 조합에서 Vercel 함수는 연결을 캐시하지 않음. Supabase 대시보드의 "Transaction Pooler" URL을 DB 연결 URL로 사용하면 해결됨. 설정 변경 1줄.  
**How to start:** Supabase 프로젝트 Settings → Database → Connection Pooling → Transaction mode URL 복사 → 환경변수 교체  
**Effort:** S (30분)  
**Priority:** P1  
**Blocked by:** 없음

### [ ] products 테이블 복합 인덱스 생성
**What:** `(destination, departure_date, capacity, nights)` 복합 인덱스  
**How to start:** 초기 마이그레이션 SQL에 포함  
**Effort:** XS (5분)  
**Priority:** P1  
**Blocked by:** 없음

### [ ] Slack Webhook 이메일 Fallback 추가
**What:** Slack Webhook 실패 시 운영자 이메일로 예약 홀딩 정보 전송  
**Why:** Slack 단일 의존 시, 알림 실패 = 예약 요청 소실. "24시간 연락" 약속이 깨짐  
**How to start:** `notification.service.ts`에 Nodemailer 또는 Resend API 연동. Slack 실패 시 catch 블록에서 이메일 발송  
**Effort:** S (1시간)  
**Priority:** P1  
**Blocked by:** 없음

### [ ] is_new_user 半생성 레코드 처리 로직
**What:** 카카오 로그인 후 회원가입 중 이탈 사용자의 half-created users 레코드 처리  
**Why:** 같은 kakao_id로 재접근 시 신규/기존 판단 기준이 명확하지 않으면 플로우 버그 발생  
**Context:** 해결 방법: users.signup_completed boolean 컬럼 추가. 회원가입 폼 제출 완료 시 true. 재방문 시 false이면 회원가입 재유도  
**Effort:** XS (30분)  
**Priority:** P1  
**Blocked by:** 없음

---

## P2 — Phase 2 진입 전

### [ ] 분할 결제 (카카오페이 그룹 링크)
**What:** 대표 예약자가 결제 후 일행에게 카카오페이 링크 발송 → 각자 분할 결제  
**Why:** "총무 고통" 완전 제거의 핵심 기능. Phase 1 없이는 총무가 여전히 정산 담당  
**Effort:** M  
**Priority:** P2

### [ ] CUI → LLM 업그레이드
**What:** rule-based 키워드 매칭 → LLM 기반 의도 파악  
**Why:** "치앙마이 4명이요"는 잡히지만 "세부에서 골프 치고 싶어요, 10월쯤"은 rule-based로 못 잡음  
**Context:** MVP에서 rule-based로 시작, 사용자 입력 패턴 수집 후 실패 케이스 모아서 LLM 프롬프트 설계  
**Effort:** M  
**Priority:** P2

### [ ] 상품 등록 페이지 (여행사용)
**What:** 여행사가 직접 웹에서 상품 등록/수정/삭제하는 어드민 UI  
**Why:** 네이버 밴드 외 다른 여행사가 입점하려면 크롤링 외 직접 등록 경로 필요  
**Context:** 크롤링으로 Phase 1 시작, 제휴 여행사가 늘면 셀프 등록 니즈 생김  
**Effort:** M  
**Priority:** P2

### [ ] 마이페이지 + 예약 히스토리
**What:** 사용자가 본인 예약 내역, 상태, 일정을 조회하는 페이지  
**Effort:** S  
**Priority:** P2

---

## P3 — Phase 3 이후

### [ ] 날씨 알림 + 대체 플랜 자동 제안
**Effort:** L | **Priority:** P3

### [ ] 다이내믹 패키징 엔진
**Effort:** XL | **Priority:** P3

### [ ] 프로그래매틱 광고 엔진
**Effort:** XL | **Priority:** P3

### [ ] 수익 모델 확정 (거래 수수료 vs SaaS vs 광고)
**What:** 현재 수익 모델 미정. Phase 1에서 가설 검증 후 결정  
**Effort:** S (결정) | **Priority:** P2-P3
