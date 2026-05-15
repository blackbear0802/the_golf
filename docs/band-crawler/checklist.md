# 밴드 크롤러 구현 체크리스트

진행률은 체크박스 갯수로 확인.

## Phase 0 — 사전 준비 (운영자 작업)
- [x] Anthropic Claude API 키 발급 → `.env` 반영
- [x] `CRON_SECRET` 발급 → `.env` 반영
- [x] developers.band.us에서 앱 등록 + Redirect URL 두 개 등록 (로컬/배포)
- [ ] `BAND_CLIENT_ID`/`BAND_CLIENT_SECRET` 발급 완료 후 `.env`에 채우기

## Phase 1 — 인프라/모델
- [x] Prisma: `AppConfig` 모델 (key String @id, value String, updatedAt)
- [x] Prisma: `Product`에 `autoImported` + `bandPostId @unique`
- [x] `lib/app-config.ts` 헬퍼 + OAuth 키(`bandAccessToken`, `bandRefreshToken`, `bandTokenExpiresAt`, `bandKey`, `bandConnectedAt`) 추가
- [x] 설치: `@anthropic-ai/sdk`

## Phase 2 — 밴드 OAuth 연동 (2026-05-15 갈아엎음)
- [x] `lib/band-oauth.ts`: authorize URL 빌드, code↔token 교환, refresh
- [x] `/api/admin/band/oauth/start`: authorize로 302
- [x] `/api/admin/band/oauth/callback`: code→token→AppConfig 저장 후 settings로 복귀
- [x] `lib/band-api-client.ts`: fetchBands / fetchPosts / fetchPostDetail (401·인증 result_code → BandApiAuthError)

## Phase 3 — /admin/settings 페이지
- [x] 담당자 정보 입력 (이름/전화/이메일)
- [x] `BandConnectionCard`: 미연결 시 "밴드 연결하기", 연결 시 가입 밴드 드롭다운 + 대상 밴드 저장 + "다시 연결"
- [x] 크롤링 활성화 토글
- [x] 상태 카드: 마지막 크롤링, 밴드 연결 상태, 자동 크롤링 ON/OFF
- [x] PATCH /api/admin/settings: 담당자/bandKey/crawlEnabled 저장

## Phase 4 — 크롤러 + Cron
- [x] `lib/band-crawler.ts` runBandCrawl: API 호출 → 1회 refresh 재시도 → 인증 실패 시 cookieExpiredAt 마커 + auth_failed 리턴
- [x] `lib/claude-parser.ts` / `contact-replacer.ts` / `media-storage.ts` / `media-classifier.ts` 그대로 재사용
- [x] `/api/cron/crawl-band/route.ts`: CRON_SECRET 검증 후 runBandCrawl 호출
- [x] `/api/admin/crawl/trigger`: 어드민 수동 트리거 + `/admin/settings`에서 결과 카드 확인
- [x] vercel.json crons 등록 (1시간 간격)

## Phase 5 — 어드민 상품 목록 UI
- [x] `/admin/products` 자동등록 뱃지/필터
- [x] 대시보드: 쿠키 만료 배너 (OAuth 만료에도 재사용) + 크롤링 상태 카드

## Phase 6 — 검증
- [ ] OAuth 연결 흐름 1회 완주 (start → 동의 → callback → 토큰 저장 확인)
- [ ] 가입 밴드 드롭다운에 대상 밴드 노출, 저장
- [ ] "지금 한 번 실행" → 게시글 1건 자동 등록
- [ ] Claude 추출 결과 schema 일치
- [ ] 이미지 URL이 상품 상세에서 렌더링
- [ ] 담당자 연락처 치환 확인
- [ ] Vercel Cron 1회 자동 실행 후 새 상품 등록
- [ ] 토큰 만료 시뮬레이션 (의도적으로 access_token 변조) → refresh 또는 만료 배너

## 후속 (이번 작업 외)
- [ ] 옛 쿠키 코드 (`lib/band-client.ts`)와 미사용 AppConfig 키(bandId/bandCookies/cookieExpiredAt) 정리
- [ ] Vercel Blob 이미지 이관 (`media-storage.ts` 구현 교체)
- [ ] 자동 등록 상품에 `draft → published` 워크플로
- [ ] 슬랙 알림 webhook
