# 어드민 "빠른 상품 등록" (본문 붙여넣기 + 이미지 드롭) 계획

## 배경 / 문제
현재 어드민은 (1) ProductForm 항목별 수동 입력으로 상품 생성 → (2) 수정 화면의 MediaManager에서 이미지 **URL을 하나씩** 입력. 신규에 이미지 기능 없음, 파일 업로드 없음. 밴드 글 1건 등록이 매우 번거로움(특히 BAND OAuth 전까지 수동 등록이 주력).

## 목표 (사용자 승인: Option A)
어드민에 화면 하나: **본문 텍스트 붙여넣기 + 이미지 파일 드래그&드롭/선택** → 저장 시 AI가 상품 필드 파싱 + 이미지 업로드·분류 → 상품+미디어 한 번에 생성. 사실상 크롤러의 수동 버전.

## 핵심 제약 → 설계
Vercel 서버리스 함수 **요청 본문 한도 ~4.5MB**. 밴드 글은 이미지 20~50장(중국 글 56장) → 단일 multipart POST 불가. 따라서 **이미지는 클라이언트가 Blob에 직접 업로드**(`@vercel/blob/client` `upload()` + 서버 토큰 브로커, Vercel 권장 패턴) 후, 텍스트 + 업로드된 Blob URL 목록(작은 JSON)만 생성 API로 전송.

## 구성
- 페이지 `src/app/admin/products/quick/page.tsx` (+ /admin/products 목록에 진입 버튼)
- 클라이언트 `src/components/admin/QuickProductForm.tsx`
  - 본문 textarea + 이미지 드롭존(미리보기·제거, `input[type=file] multiple accept=image/*`)
  - 제출: 각 이미지 → 클라이언트 `upload()`로 Blob 직행 → Blob URL 수집 → `{ text, imageUrls[] }` POST
- 서버 `src/app/api/admin/blob-upload/route.ts` — `handleUpload` 토큰 브로커, **admin 인증 게이트**
- 서버 `src/app/api/admin/products/quick/route.ts` — admin 인증 → `stripContacts`+`parseProduct`(실패 시 사유 반환) → 포함/불포함 operator 합성 → `prisma.product.create`(departureLabel/capacityLabel 포함, autoImported=false, sourceUrl=null, rawText=원문) → imageUrls를 `classifyImage(url,null,text)`로 분류해 `productMedia.createMany` → 생성 id 반환
- 클라이언트는 생성 후 `/admin/products/[id]/edit`로 이동(기존 ProductForm 동작과 일치, 거기서 검수·미디어 보정)

## 재사용 (무변경)
`parseProduct`, `stripContacts`/`stripContactsFromArray`/`loadOperators`/`formatOperatorLine`, `classifyImage`, prisma, 기존 admin 인증 패턴. Blob은 클라이언트 `upload()` 사용(서버 storeFromUrl 불필요 — 이미 Blob URL).

## 비목표
- 이미지 단일 복붙(Option B) 미포함 — 클립보드 한계로 신뢰 불가, 사용자 미선택.
- 자동 미디어 순서/캡션 정교화(생성 후 MediaManager에서). docx 자동 추출. 텍스트 내 이미지 URL 자동 수거.

## 리스크 / 결정
- classifyImage가 파일명 무의미 시 본문 컨텍스트로만 분류 → 대략 분류. 생성 후 MediaManager에서 보정 가능(허용 가능한 degrade).
- 클라이언트 업로드는 public Blob 스토어·토큰 정상 전제(이미 구축, [[image-hosting]]). 토큰/스토어 문제 시 업로드 실패 → 그 이미지 건너뛰고 상품은 생성(복원력 원칙), 경고 표시.
- parseProduct 실패(필수값 부족) 시 상품 미생성 + 사유 반환(사용자가 본문 보강 후 재시도).
