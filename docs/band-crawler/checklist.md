# 밴드 크롤러 구현 체크리스트

진행률은 체크박스 갯수로 확인.

## Phase 0 — 사전 준비 (운영자 작업)
- [ ] Anthropic Claude API 키 발급 및 충전
- [ ] `.env` 와 Vercel 환경변수에 `ANTHROPIC_API_KEY` 추가
- [ ] Vercel 환경변수에 `CRON_SECRET` 추가 (랜덤 32바이트)
- [ ] 운영자가 본인 NID_AUT/NID_SES 쿠키 추출 방법 숙지

## Phase 1 — 인프라/모델
- [ ] Prisma: `AppConfig` 모델 (key String @id, value String, updatedAt)
- [ ] Prisma: `Product`에 `autoImported Boolean @default(false)` + `bandPostId String? @unique` 추가
- [ ] `npx prisma db push` 로 DB 반영
- [ ] `lib/app-config.ts` 헬퍼 (get/set with type coercion)
- [ ] 설치: `@anthropic-ai/sdk`, `node-html-parser` (또는 cheerio)

## Phase 2 — /admin/settings 페이지
- [ ] `/admin/settings/page.tsx` 서버 컴포넌트 (현재 값 로드)
- [ ] 폼: 운영자 연락처 (name/phone/email)
- [ ] 폼: 밴드 ID, NID_AUT, NID_SES 쿠키
- [ ] 토글: 크롤링 활성화 ON/OFF
- [ ] PATCH /api/admin/settings: 검증 후 AppConfig 일괄 저장
- [ ] 상태 카드: 마지막 크롤링 시각, 성공/실패 카운트, 쿠키 만료 경고

## Phase 3 — 크롤링 코어
- [ ] `lib/band-client.ts`: fetchPostList(bandId, cookies) → BandPostMeta[]
- [ ] `lib/band-client.ts`: fetchPostDetail(postId, cookies) → { html, imageUrls, youtubeUrls, text }
- [ ] `lib/claude-parser.ts`: parseProduct(text) → ParsedProduct (JSON)
- [ ] `lib/contact-replacer.ts`: replaceContacts(text, operator) → cleanedText
- [ ] `lib/media-storage.ts`: storeFromUrl(url) → string (MVP는 그대로 반환)
- [ ] `lib/media-classifier.ts`: 이미지 URL/캡션 키워드로 golf/accommodation/dining 분류 (LLM 부담 줄이려 규칙 1차 → 추후 LLM)

## Phase 4 — Cron 엔드포인트
- [ ] `/api/cron/crawl-band/route.ts`: CRON_SECRET 검증
- [ ] 흐름: 활성화 OFF면 skip → 쿠키 fetch → 글 목록 → 이미 등록된 bandPostId 제외 → 신규 글마다 (상세 fetch → Claude 파싱 → 치환 → Product+Media 생성)
- [ ] 결과: AppConfig에 `lastCrawlAt`, `lastCrawlSuccess`, `lastCrawlNew` 기록
- [ ] 인증 실패 감지 시 `cookieExpiredAt` 기록 후 종료

## Phase 5 — Vercel Cron 등록
- [ ] `vercel.json`에 `{ "crons": [{ "path": "/api/cron/crawl-band", "schedule": "0 * * * *" }] }`
- [ ] 첫 배포 후 Vercel 대시보드에서 Cron 실행 로그 확인

## Phase 6 — 어드민 상품 목록 UI
- [ ] `/admin/products` 목록에 `autoImported` 뱃지 노출
- [ ] 필터: 자동 등록 / 수동 등록 토글
- [ ] 어드민 대시보드: 쿠키 만료 / 마지막 실행 상태 카드

## Phase 7 — 검증
- [ ] 1건 수동 트리거로 게시글 1개 등록 확인
- [ ] Claude 추출 결과가 schema와 일치하는지
- [ ] 이미지 URL이 상품 상세에서 정상 렌더링되는지
- [ ] 담당자 연락처가 본문에서 치환되었는지
- [ ] Vercel Cron 1회 자동 실행 후 새 상품 등록되는지
- [ ] 쿠키 만료 시뮬레이션 (잘못된 쿠키 입력) → 어드민에 경고 뜨는지

## 후속 (이번 작업 외)
- [ ] Vercel Blob으로 이미지 이관 (`media-storage.ts` 구현 교체)
- [ ] 자동 등록 상품에 `draft → published` 워크플로 추가
- [ ] 슬랙 알림 webhook
