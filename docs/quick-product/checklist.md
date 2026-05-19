# 빠른 상품 등록 체크리스트

## 1. 서버 — Blob 클라이언트 업로드 브로커
- [ ] `src/app/api/admin/blob-upload/route.ts` — `handleUpload`(@vercel/blob/client server)
- [ ] admin 세션 검증(기존 admin 라우트 인증 패턴 재사용), 비admin 거부
- [ ] 허용 contentType 이미지로 제한

## 2. 서버 — 빠른 생성 API
- [ ] `src/app/api/admin/products/quick/route.ts` POST, admin 게이트
- [ ] body `{ text, imageUrls[] }` 검증
- [ ] `stripContacts`→`parseProduct`; null이면 400 + 사유
- [ ] included/excluded operator 합성(band-crawler와 동일 로직)
- [ ] `prisma.product.create`: 모든 필드 + departureLabel/capacityLabel, autoImported=false, sourceUrl=null, rawText=원문
- [ ] imageUrls → `classifyImage(url,null,text)` → `productMedia.createMany`(order 순서대로)
- [ ] 생성 product id 반환

## 3. 클라이언트 — QuickProductForm
- [ ] textarea(본문) + 드롭존(drag&drop + file input, multiple, image/*)
- [ ] 썸네일 미리보기·개별 제거
- [ ] 제출: 각 파일 `upload()` → Blob URL 수집(진행 표시) → `{text,imageUrls}` POST
- [ ] 실패 이미지 건너뛰고 경고, parseProduct 실패 사유 표시
- [ ] 성공 시 `/admin/products/[id]/edit` 이동

## 4. 진입점
- [ ] `/admin/products` 목록 상단에 "빠른 등록(본문 붙여넣기)" 버튼/링크
- [ ] `src/app/admin/products/quick/page.tsx` (admin 레이아웃, 컴포넌트 마운트)

## 5. 검증
- [ ] `npm run build` 통과
- [ ] 텍스트만(이미지 0) → 상품 생성·필드 정상
- [ ] 이미지 수 장 + 본문 → 상품 + ProductMedia(Blob URL) 생성, 상세페이지 렌더
- [ ] parseProduct 실패 케이스 → 사유 표시, 미생성
- [ ] 비admin 접근 차단 확인
- [ ] 커밋·푸시·자동배포·라이브 1건 실제 등록 확인

## 6. 마무리
- [ ] context-notes 결정 기록, 메모리 갱신([[project-band-crawl]] 수동 등록 경로 추가)
