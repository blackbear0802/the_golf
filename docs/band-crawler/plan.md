# 네이버 밴드 크롤링 → 자동 상품 등록 파이프라인 (Plan)

작성일: 2026-05-14

## 목적
공동운영자 계정으로 가입한 비공개 네이버 밴드의 골프 투어 게시글을 주기적으로 수집해, Claude API로 상품 필드를 자동 추출하고, 담당자 연락처를 우리 측 정보로 치환한 뒤 Product + ProductMedia 레코드를 자동 생성한다. 어드민은 결과를 검수해 수정/삭제한다.

## 설계 결정 (확정)
- **대상**: 본인이 가입한 비공개 밴드, 본인이 공동운영자
- **인증**: 운영자가 `/admin/settings` 페이지에서 band.us의 Cookie 헤더(전체)를 한 덩어리로 붙여넣음. AppConfig.bandCookies에 raw 문자열 저장. (band.us는 자체 인증을 쓰며 핵심 쿠키 조합이 모호해 전체 보관이 안전 — NID_AUT/NID_SES는 naver.com 도메인 쿠키라 무관)
- **트리거**: Vercel Cron (1시간 간격, 추후 조정)
- **파싱**: Claude API (Haiku 4.5 default — 비용 효율)
- **연락처 치환**: AppConfig에 담당자 2명 분의 (`operator1Name/Phone/Email`, `operator2Name/Phone/Email`) 보관. 본문에 포함된 원본 연락처를 정규식으로 제거하고 두 담당자 정보를 모두 노출 (예: "담당: 홍길동 010-..., 김철수 010-...")
- **미디어**: 1단계 URL 그대로 ProductMedia.url 저장. `lib/media-storage.ts` 추상화 계층을 둬서 2단계에서 Vercel Blob 이관 시 호출부 변경 없게
- **운영 흐름**: 자동 등록 → 어드민 상품 목록에서 `auto_imported=true` 뱃지로 식별 → 검수/수정/삭제

## 시스템 구성 요소
1. **AppConfig 모델** (Prisma): key/value 단순 KV
2. **/admin/settings 페이지**: 세션 쿠키, 담당자 정보, 크롤링 ON/OFF, 최근 실행 결과 표시
3. **lib/band-client.ts**: 쿠키 헤더로 밴드 페이지 fetch, 글 목록/상세 파싱 (HTML)
4. **lib/claude-parser.ts**: Anthropic SDK 호출, 본문 → 상품 필드 JSON
5. **lib/media-storage.ts**: `storeFromUrl(url) → string` 추상화. MVP는 입력 그대로 반환
6. **lib/contact-replacer.ts**: 본문/필드에서 전화번호·이메일 패턴을 운영자 정보로 치환
7. **api/cron/crawl-band/route.ts**: Vercel Cron 진입점. 보안: `CRON_SECRET` 헤더 검증
8. **Product/ProductMedia 확장**: `autoImported` Boolean, `bandPostId` String? (중복 방지 유니크)
9. **/admin/crawl/page.tsx** (선택): 최근 크롤링 로그, 수동 트리거 버튼

## 보안/안정성
- 쿠키는 DB 평문 저장 (운영 DB가 Neon 격리, 짧은 수명) → 향후 KMS 암호화 검토
- Cron 엔드포인트는 `CRON_SECRET` 환경변수 검증 (Vercel 자동 주입)
- Claude 호출 실패/타임아웃 시 해당 글 skip, 다음 실행에서 재시도
- 쿠키 만료 감지: 응답이 로그인 페이지로 리다이렉트되거나 200이 아니면 AppConfig에 `cookieExpiredAt` 기록 + 어드민 대시보드 배너

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
