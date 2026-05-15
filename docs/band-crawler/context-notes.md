# 밴드 크롤러 컨텍스트 노트

작업 중 내린 판단과 그 이유. 다음 세션이 같은 결정을 다시 하지 않도록.

## 2026-05-14 — 설계 확정 라운드

### 왜 자동 등록인데 staging이 아닌가
사용자가 "자동 등록 → 사후 수정"을 명시 선택. staging 모델을 두면 운영자 클릭 1번이 추가되는데, 본인이 공동운영자라 신뢰도가 충분하고 한 단계라도 줄이는 게 우선. 다만 `autoImported=true` 뱃지로 검수 대상임을 명확히 표시한다.

### 왜 LLM은 Haiku 4.5인가
입력 2KB 정도의 게시글 텍스트라 Sonnet/Opus급은 과잉. Haiku도 JSON 출력 안정성 충분. 일 비용 $0.05 이내 유지 목표.

### 왜 쿠키 자동 갱신을 안 하나 (참고용 — 폐기)
네이버는 자동화 로그인을 ML로 감지·차단함. Playwright + 본인 ID/PW를 서버에 두고 자동 로그인 시도하면 계정 잠김 위험이 있음.
→ 결국 쿠키 방식 자체를 폐기하고 공식 Open API + OAuth로 전환했다 (아래 2026-05-15 항목).

### 왜 NID_AUT/NID_SES 가 아니라 Cookie 헤더 통째로인가 (참고용 — 폐기)
처음에 NID_AUT/NID_SES로 안내했지만 그건 naver.com 도메인 쿠키임. band.us는 별도 인증 시스템(ai/as/band_session/BBC/di/JSESSIONID/rt/secretKey/SESSION 등)을 쓰고, 어떤 조합이 필수인지 외부에 명확하지 않음. → OAuth로 갈아엎으면서 이 결정도 함께 폐기.

### 왜 이미지를 Blob에 안 옮기나 (1단계)
URL 그대로가 인프라 0, 비용 0. 네이버 CDN이 외부 핫링크를 막을 가능성은 있지만 일반 게시글 이미지는 Origin 체크 안 함 (확인 필요). `lib/media-storage.ts` 추상화를 두는 이유는 막혔을 때 호출부 손대지 않고 구현만 갈아끼우기 위함.

### 왜 contact replacer가 따로 필요한가
원본 게시글에 공급사 직통 번호가 있음. 우리 플랫폼은 더 골프가 단일 창구로 보여야 하므로 본문(rawText/included description)과 메타에서 패턴(010-xxxx-xxxx, 이메일) 매칭 후 운영자 정보로 치환. Claude에 "연락처는 모두 OPERATOR_CONTACT로 통일" 지시도 같이 줘서 이중 안전망.

### 왜 BandCrawledData를 그대로 살리는가
이미 schema에 있음. 게시글 본문 원문을 보관해두면 (a) 파싱이 빗나갔을 때 어드민이 원문 비교 가능, (b) 추후 다른 모델로 재파싱 시 재크롤링 없이 백필 가능. processed 상태를 활용해 재처리 큐로 쓸 수 있음.

### bandPostId 중복 방지
같은 게시글이 두 번 크롤링되는 사고 방지. Product에 unique 인덱스. 글이 수정될 가능성도 있지만 1단계에서는 첫 fetch만 신뢰.

## 2026-05-15 — 쿠키 방식 → 공식 Open API(OAuth) 전환

### 왜 갈아엎었나
- 첫 검증에서 쿠키 fetch가 status=301로 떨어졌고, band.us의 인증/리다이렉트 동작이 불투명해 false negative 위험이 컸음.
- 사용자가 developers.band.us에서 신규 앱 등록이 가능함을 확인 → 공식 API가 압도적으로 안정적이고 약관상 합법적이라 즉시 갈아엎기로 결정.

### 확정된 사양 (검증 완료)
- Authorize URL: `https://auth.band.us/oauth2/authorize?response_type=code&client_id=…&redirect_uri=…`
- Token URL: `GET https://auth.band.us/oauth2/token?grant_type=authorization_code&code=…` + `Authorization: Basic base64(client_id:client_secret)`
- Refresh: 동일 token URL, `grant_type=refresh_token&refresh_token=…` (응답에 refresh_token이 있을 때만 사용)
- API base: `https://openapi.band.us`
  - `GET /v2.1/bands?access_token=…` — 가입 밴드 목록 (`result_data.bands[].band_key`)
  - `GET /v2/band/posts?band_key=…&access_token=…&locale=ko-KR` — 게시글 목록 (`result_data.items[]`, `paging.next_params`)
  - `GET /v2.1/band/post?band_key=…&post_key=…&access_token=…` — 게시글 상세 (`result_data.post`)
- 응답 형식: `{result_code: 1, result_data: ...}`. result_code != 1 이면 에러. 1003/1006/1024는 인증 오류로 분류해 refresh 트리거.

### 코드 구성
- `lib/band-oauth.ts` — authorize URL 생성, code↔token 교환, refresh
- `lib/band-api-client.ts` — fetchBands/fetchPosts/fetchPostDetail. 401/인증 result_code 시 BandApiAuthError throw
- `lib/band-crawler.ts` — runBandCrawl: 토큰 로드 → API 호출 → BandApiAuthError 시 1회 refresh 후 재시도 → 그래도 실패면 cookieExpiredAt 마커 + auth_failed 리턴
- `/api/admin/band/oauth/{start,callback}` — start는 authorize로 302, callback은 토큰 저장 후 settings로 복귀
- `/admin/settings`의 BandConnectionCard — 미연결이면 "밴드 연결하기", 연결됨이면 가입 밴드 드롭다운 + "다시 연결"

### 보존된 옛 코드 (검증 끝나면 정리)
- `lib/band-client.ts` — HTML 스크래핑 클라이언트. 호출자 없음. 롤백/참고용으로만 남김.
- AppConfig 키 `bandId`, `bandCookies`, `cookieExpiredAt`은 그대로 남겨둠. `cookieExpiredAt`은 OAuth에서도 "인증 만료 마커"로 재사용 중.

## 미해결/다음에 결정할 것
- 게시글 본문에서 이미지 타입(golf/accommodation/dining) 분류를 키워드로 할지 LLM에 한 번에 맡길지. 1차는 키워드, 부족하면 LLM에 같이 분류 요청하는 식으로 점진 확장.
- 본문에 가격이 "GA 1,200,000 / VIP 1,500,000" 식으로 여러 등급이 있을 때 어떻게 다룰지. 현재 Product.price는 단일 Int. → 일단 가장 낮은 가격을 price로 넣고 included에 등급 정보 텍스트로 보존.
- 출발일이 "2026-06-12~16" 같은 범위로 적힌 경우. 1단계는 시작일을 departureDate, 박수를 nights에 자동 계산.
