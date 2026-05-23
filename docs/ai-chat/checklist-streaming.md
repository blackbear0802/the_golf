# AI 챗 스트리밍 + DB 영속 체크리스트

## 1. API (route.ts)
- [ ] 에러 응답(4xx/5xx) → JSON 유지, 성공 응답 → NDJSON ReadableStream
- [ ] 이벤트 포맷: `{type:"delta",text}` / `{type:"done",products,link,sessionId}` / `{type:"error",message}`
- [ ] 첫 번째 Anthropic 호출 비스트리밍(tool_use 감지), 두 번째 호출 `messages.stream()` 스트리밍
- [ ] tool_use 없을 때 첫 번째 호출 텍스트 → 단일 delta + done
- [ ] 로그인 사용자: ChatSession 조회/신규 생성, user 메시지 즉시 저장
- [ ] 스트리밍 완료 후 assistant 메시지 + ChatSession.updatedAt 저장
- [ ] done 이벤트에 sessionId 포함

## 2. GET /api/chat/session (신규)
- [ ] 로그인 사용자: 가장 최근 ChatSession + 최대 40개 메시지 반환
- [ ] 비로그인: `{messages:[], sessionId:null}` 반환

## 3. ChatRoom.tsx
- [ ] `useSession` 도입 — authStatus "loading" 동안 hydration 대기
- [ ] 로그인 시: GET /api/chat/session 호출 → DB 메시지 복원 + sessionId 설정
- [ ] DB 없으면 sessionStorage 폴백
- [ ] 비로그인: 기존 sessionStorage 복원 유지
- [ ] send 함수: response.body ReadableStream NDJSON 버퍼 파싱
- [ ] delta 첫 도착 시 assistant 메시지 추가, 이후 content 갱신
- [ ] done: products/link 확정, sessionId 업데이트
- [ ] error: 에러 표시, 임시 assistant 메시지 제거
- [ ] TypingIndicator: loading=true 이고 마지막 메시지가 user일 때만 표시
- [ ] 새 대화: sessionIdRef를 새 UUID로 리셋

## 4. 검증
- [ ] 비로그인: 스트리밍 텍스트 흘러나옴, sessionStorage 복원
- [ ] 로그인: 챗 후 새로고침 → DB에서 대화 복원
- [ ] 새 대화 후 첫 메시지 → 새 ChatSession 생성
- [ ] 스트리밍 중 에러 → 에러 표시 + 임시 메시지 정리
- [ ] tool_use 없는 응답도 정상 표시
