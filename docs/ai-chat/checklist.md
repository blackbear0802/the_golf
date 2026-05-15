# AI 챗 구현 체크리스트

## Phase 1 — 도구 + 백엔드 (서버)
- [ ] `lib/chat-tools.ts`: Anthropic tool schema(`search_products`) + executeSearchProducts(args) — Prisma 쿼리. 결과는 Product의 노출용 필드만(id, destination, golfCourse, departureDate, nights, price, capacity, coverImage).
- [ ] `lib/chat-rate-limit.ts`: IP 기반 LRU 메모리 카운터 (시간당 30턴). 30턴 초과 시 false 반환.
- [ ] `lib/chat-prompts.ts`: system prompt (역할·금지·tool 사용 가이드).
- [ ] `/api/chat/route.ts`:
  - [ ] POST. body 검증(messages 배열, sessionId 문자열).
  - [ ] rate limit 체크 (IP).
  - [ ] Anthropic SDK 호출 (model=claude-haiku-4-5, tools=[search_products]).
  - [ ] 응답이 tool_use면 executeSearchProducts → 결과를 tool_result로 messages에 append → Anthropic 한 번 더 호출 → 최종 응답.
  - [ ] 응답 `{ content, recommendedProductIds, turnsLeft }` JSON 반환.
  - [ ] 에러 핸들링(타임아웃, API 실패) — 클라이언트에 사용자 친화 메시지.

## Phase 2 — 프론트 (챗 페이지)
- [ ] `/app/chat/page.tsx`: 서버 컴포넌트 셸 + 클라이언트 ChatRoom 렌더. searchParams.initial 받아 ChatRoom에 prop으로 내려줌.
- [ ] `/components/chat/ChatRoom.tsx` (client):
  - [ ] messages state.
  - [ ] sessionId useState(uuid 한 번 생성).
  - [ ] sessionStorage에 turnCount 보관(비로그인 5턴 제한).
  - [ ] 마운트 시 initial prop 있으면 자동 send.
  - [ ] 입력창 + 전송 버튼 + "새 대화" 버튼.
  - [ ] 로딩 중 typing indicator.
  - [ ] 에러 메시지 표시.
- [ ] `/components/chat/ChatMessage.tsx`:
  - [ ] role별 스타일 (user는 우측, assistant 좌측).
  - [ ] assistant 메시지 아래에 recommendedProductIds가 있으면 ProductCard 묶음(가로 스크롤 또는 2x2 그리드).
- [ ] ProductCard 재사용 — 추가 fetch 없이 server-side로 미리 가져와야 한다면 별도 API(`/api/products/by-ids`) 또는 chat API 응답에 카드 미니 데이터 포함. **결정: chat API 응답에 카드 노출용 mini 데이터 같이 포함.**

## Phase 3 — Hero 진입점 변경
- [ ] `/components/Hero.tsx` goSearch → goChat으로 교체. submit 시 `/chat?initial=<query>`.
- [ ] 예시 칩 클릭도 동일하게 chat으로 이동.
- [ ] 빈 입력으로 submit 시 `/chat`로 (initial 없이).

## Phase 4 — 검증
- [ ] 비로그인으로 "치앙마이 4명 4박 골프" 입력 → 챗 페이지 진입 → AI 응답 → 카드 노출
- [ ] 카드 클릭 → 상품 상세 정상 이동
- [ ] AI가 정보 부족하다고 판단해 되묻는 케이스 1건 확인
- [ ] 비로그인 5턴 후 차단 메시지 노출
- [ ] Anthropic API 실패 시뮬레이션 → 사용자 친화 에러
- [ ] 모바일 viewport에서 메시지 풍선/카드 묶음 깨짐 없는지

## 후속 (이번 작업 외)
- [ ] 스트리밍 응답 (Anthropic SDK streaming + ReadableStream)
- [ ] 대화 DB 저장(`ChatSession`, `ChatMessage` 모델)
- [ ] 어드민 사용량 대시보드
- [ ] 개인화(구매 이력 기반)
