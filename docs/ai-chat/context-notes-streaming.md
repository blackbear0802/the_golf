# AI 챗 스트리밍 + DB 영속 컨텍스트 노트

## 2026-05-23 설계 결정

### 스트리밍 방식: NDJSON (줄 단위 JSON)
- SSE 대신 NDJSON 선택. Next.js App Router에서 SSE(`text/event-stream` + `data: ...`) 대비 파싱 코드가 단순하고, `response.body` ReadableStream을 직접 읽으면 됨.
- 첫 번째 Anthropic 호출은 비스트리밍 유지. 이유: tool_use 블록이 오면 입력 JSON을 버퍼에 누적해 파싱해야 하는 복잡도가 생김. Haiku 4.5는 첫 호출 latency ~500ms로 짧아 비스트리밍도 체감 차이 없음.
- 두 번째 호출(실제 텍스트 응답)만 `client.messages.stream()`으로 스트리밍. 첫 글자가 ~600ms(첫 호출 + 도구 실행) 후 보이기 시작해 기존 1.5~3s 대비 개선.
- tool_use 없는 케이스: 첫 호출 텍스트를 단일 delta 청크로 전송. 동일 포맷 유지.

### DB 영속 범위: 로그인 사용자만
- 비로그인은 sessionStorage 유지. 비로그인 세션 ID(클라이언트 UUID)로 나중에 식별할 방법이 없어 DB 저장 실익이 없음.
- 로그인 → 재방문 시 최근 세션 복원이 실질적 가치.
- assistant 메시지에 recommendedProducts/link는 DB에 저장 안 함. 텍스트 content만 보존. 복원 시 카드 없이 텍스트만 보여도 맥락 파악에 충분. (향후 metadata JSON 컬럼으로 확장 가능)

### 세션 ID 흐름
```
클라이언트 UUID(초기) → POST /api/chat → DB ChatSession 생성 → done.sessionId 반환 → 이후 요청은 DB ID 사용
```
- 새 대화 클릭 시 sessionIdRef를 새 UUID로 리셋 → 다음 메시지에서 새 ChatSession 생성.
- GET /api/chat/session 복원 시 DB ID를 sessionIdRef에 설정 → 기존 세션에 메시지 append.

### TypingIndicator 표시 조건
- `loading=true` + 마지막 메시지가 user(assistant 미추가) → 점 애니메이션 표시.
- 첫 delta 도착 시 assistant 메시지 추가 → TypingIndicator 자동 숨김, 스트리밍 텍스트 표시.

### 알려진 제약
- 세션당 최대 복원 메시지 40개(GET /api/chat/session). 오래된 메시지는 UI에 안 나오지만 DB에 보존됨.
- 스트리밍 중 네트워크 끊김 시 임시 assistant 메시지 제거 + 에러 표시. 이미 저장된 user 메시지는 DB에 남음(orphan). 허용 가능한 수준.
