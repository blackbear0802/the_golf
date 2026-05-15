# 네이버 밴드 크롤링 → 자동 상품 등록 파이프라인 (Plan)

작성일: 2026-05-14

## 목적
공동운영자 계정으로 가입한 비공개 네이버 밴드의 골프 투어 게시글을 주기적으로 수집해, Claude API로 상품 필드를 자동 추출하고, 담당자 연락처를 우리 측 정보로 치환한 뒤 Product + ProductMedia 레코드를 자동 생성한다. 어드민은 결과를 검수해 수정/삭제한다.

## 설계 결정 (확정, 2026-05-15 OAuth 전환 반영)
- **대상**: 본인이 가입한 비공개 밴드, 본인이 공동운영자
- **인증**: 네이버 밴드 Open API + OAuth 2.0. 운영자가 `/admin/settings`에서 "밴드 연결하기" 클릭 → band 동의 화면 → 콜백으로 받은 code를 access_token/refresh_token으로 교환해 AppConfig에 저장. (옛 쿠키 헤더 방식은 2026-05-15에 갈아엎음 — context-notes 참조)
- **API base**: `https://openapi.band.us` (`/v2.1/bands`, `/v2/band/posts`, `/v2.1/band/post`)
- **트리거**: Vercel Cron (1시간 간격, 추후 조정) + 어드민 수동 트리거
- **파싱**: Claude API (Haiku 4.5 default — 비용 효율)
- **연락처 치환**: AppConfig에 담당자 2명 분의 (`operator1Name/Phone/Email`, `operator2Name/Phone/Email`) 보관. 본문에 포함된 원본 연락처를 정규식으로 제거하고 두 담당자 정보를 모두 노출.
- **미디어**: 1단계 URL 그대로 ProductMedia.url 저장. `lib/media-storage.ts` 추상화로 2단계 Blob 이관에 대비.
- **운영 흐름**: 자동 등록 → 어드민 상품 목록에서 `auto_imported=true` 뱃지로 식별 → 검수/수정/삭제

## 시스템 구성 요소
1. **AppConfig 모델** (Prisma): key/value 단순 KV. OAuth 토큰 + 대상 밴드 키도 여기.
2. **/admin/settings 페이지**: 담당자 정보, BandConnectionCard(연결/대상 밴드 선택), 크롤링 ON/OFF, 수동 트리거, 최근 실행 결과 표시.
3. **lib/band-oauth.ts**: authorize URL 빌드, code↔token 교환, refresh.
4. **lib/band-api-client.ts**: `https://openapi.band.us` 기반 fetchBands/fetchPosts/fetchPostDetail. 401·인증 result_code → BandApiAuthError.
5. **lib/band-crawler.ts**: 토큰 로드 → API 호출(401 시 1회 refresh) → 본문→Claude→Product/ProductMedia 생성.
6. **lib/claude-parser.ts**: Anthropic SDK 호출, 본문 → 상품 필드 JSON.
7. **lib/media-storage.ts**: `storeFromUrl(url) → string` 추상화. MVP는 입력 그대로 반환.
8. **lib/contact-replacer.ts**: 본문/필드에서 전화번호·이메일 패턴을 운영자 정보로 치환.
9. **api/cron/crawl-band/route.ts**: Vercel Cron 진입점. `CRON_SECRET` 헤더 검증 후 runBandCrawl 호출.
10. **api/admin/band/oauth/{start,callback}/route.ts**: OAuth 시작/완료.
11. **api/admin/crawl/trigger/route.ts**: 어드민 수동 트리거.
12. **Product/ProductMedia 확장**: `autoImported` Boolean, `bandPostId` String? (중복 방지 유니크).

## 보안/안정성
- access_token/refresh_token은 DB 평문 저장 (운영 DB Neon 격리) → 향후 KMS 암호화 검토.
- BAND_CLIENT_ID/SECRET은 환경변수, .env는 .gitignore로 보호. Vercel에는 동일 키 등록 필요.
- Cron 엔드포인트는 `CRON_SECRET` 환경변수 검증 (Vercel 자동 주입).
- 토큰 만료/인증 실패: BandApiAuthError → 1회 refresh 재시도. 그래도 실패면 AppConfig.cookieExpiredAt 마커(이름 유지) + 대시보드 배너 + lastCrawlError 기록.
- Claude 호출 실패/타임아웃 시 해당 글 skip, 다음 실행에서 재시도.

## 비용 가정
- Haiku 4.5: 입력 $0.80/MTok, 출력 $4.00/MTok
- 게시글 1건 = 입력 ~2KB, 출력 ~1KB → ~$0.0002/건
- 1시간에 5~10건 새 글 가정 → 일 $0.05 이내

## 위험
- 네이버 자동화 차단 (User-Agent, 요청 빈도 제한): 1시간 간격 + 자연스러운 UA로 완화
- 네이버 HTML 마크업 변경: 파서 깨질 수 있음 → 응답 저장(BandCrawledData.content) 후 실패 시 디버깅
- 본문 형식이 자유라 LLM 추출이 빗나갈 가능성: `auto_imported=true` 뱃지로 어드민 검수 강제
- 약관 위반 리스크: 본인 가입 밴드 + 본인 권한 범위 + 1시간 간격이라 회색지대지만 위험 0은 아님. 비상시 Cron OFF 토글 필요

## 범위 외 (이번 작업에 포함 안 함)
- Vercel Blob 이미지 이관 (인터페이스만 만들고 구현은 다음)
- 운영자 자동 로그인 (Playwright 워커 등 2단계)
- 다중 운영자/다중 밴드 관리
- 알림(슬랙/이메일) 발송
