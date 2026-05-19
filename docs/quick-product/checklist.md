# 빠른 상품 등록 체크리스트

## 1. 서버 — Blob 클라이언트 업로드 브로커
- [x] `src/app/api/admin/blob-upload/route.ts` — `handleUpload`(@vercel/blob/client server)
- [x] admin 세션 검증(기존 admin 라우트 인증 패턴 재사용), 비admin 거부
- [x] 허용 contentType 이미지로 제한

## 2. 서버 — 빠른 생성 API
- [x] `src/app/api/admin/products/quick/route.ts` POST, admin 게이트
- [x] body `{ text, imageUrls[] }` 검증
- [x] `stripContacts`→`parseProduct`; null이면 400 + 사유
- [x] included/excluded operator 합성(band-crawler와 동일 로직)
- [x] `prisma.product.create`: 모든 필드 + departureLabel/capacityLabel, autoImported=false, sourceUrl=null, rawText=원문
- [x] imageUrls → `classifyImage(url,null,text)` → `productMedia.createMany`(order 순서대로)
- [x] 생성 product id 반환

## 3. 클라이언트 — QuickProductForm
- [x] textarea(본문) + 드롭존(drag&drop + file input, multiple, image/*)
- [x] 썸네일 미리보기·개별 제거
- [x] 제출: 각 파일 `upload()` → Blob URL 수집(진행 표시) → `{text,imageUrls}` POST
- [x] 실패 이미지 건너뛰고 경고, parseProduct 실패 사유 표시
- [x] 성공 시 `/admin/products/[id]/edit` 이동

## 4. 진입점
- [x] `/admin/products` 목록 상단에 "빠른 등록(본문 붙여넣기)" 버튼/링크
- [x] `src/app/admin/products/quick/page.tsx` (admin 레이아웃, 컴포넌트 마운트)

## 5. 검증
- [x] `npm run build` 통과
- [x] `npm run build` 통과, 3개 라우트 배포 확인
- [x] 비admin 접근 차단 확인(API 403, 페이지 404=어드민 가드 일관)
- [x] 정적 `quick` 라우트가 `[id]` 동적보다 우선 확인
- [ ] (사용자) 어드민 로그인 후 텍스트만 → 상품 생성·필드 정상
- [ ] (사용자) 본문+이미지 수 장 → 상품+ProductMedia(Blob URL) 생성·상세 렌더
- [ ] (사용자) parseProduct 실패 케이스 → 사유 표시·미생성
서버 로직은 검증된 파이프라인(parseProduct/operator/classifyImage/createMany) 재조합이라 빌드+게이트까지 에이전트 검증, 인증 e2e는 브라우저 필요로 사용자 확인.

## 6. 마무리
- [x] context-notes 결정 기록, 메모리 갱신([[project-band-crawl]] 수동 등록 경로 추가)
