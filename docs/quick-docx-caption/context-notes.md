# 빠른 등록 Word 캡션 — 컨텍스트 노트

## 배경 / 기존 한계
- 기존 `loadDocx`(QuickProductForm.tsx)는 본문과 이미지를 **분리** 추출.
  - 본문: `document.xml` 태그 제거 → 한 덩어리.
  - 이미지: `word/media/*` 를 zip 저장 순서로 수집 → 문서상 위치/주변 텍스트와 무관.
- 빠른등록 API(`quick/route.ts`)는 `imageUrls: string[]` 만 받고 **caption 미저장**.
  - DB `ProductMedia.caption` 컬럼은 이미 존재(스키마 schema.prisma:104).
- 그래서 "이미지 바로 위 텍스트 → 캡션"은 위치정보가 파싱에서 소실돼 불가능했음.

## 결정
- **문서 순서 파싱으로 재작성**해 이미지와 직전 문단을 페어링.
  - docx 이미지 참조: `<a:blip r:embed="rId..">`(DrawingML) 또는 `<v:imagedata r:id="rId..">`(VML).
  - `rId` → 실제 파일: `word/_rels/document.xml.rels` 의 `Target`(= `media/imageN.ext`, word/ 기준 상대경로).
  - 하이퍼링크도 `r:id` 를 쓰지만 Target이 외부 URL이라 media 이미지 맵에 안 잡힘 → 안전.
- **"바로 위" 정의** — 블록 리스트에서 이미지의 **직전 블록이 텍스트면 캡션, 이미지면 캡션 없음**.
  - 빈 문단은 텍스트 블록으로 안 만들므로 자연히 건너뜀.
  - 갤러리(텍스트 후 이미지 여러 장)는 첫 장만 캡션, 나머지는 캡션 없음(= "직접 위" 문자 그대로 해석).
- **캡션 길이 캡 80자** — 본문 한 덩어리가 캡션으로 딸려오는 것 방지.
- **미참조 media 이미지**는 캡션 없이 뒤에 append → 기존 "임베드 이미지 전부 포함" 동작 보존
  (헤더/푸터 전용 이미지는 document.xml에 없어 제외되는데, 이는 오히려 개선).

## 부수 이득
- `classifyImage(url, caption, text)` 2번째 인자가 caption인데 기존엔 `null` 전달.
  이제 per-image 캡션 전달 → 골프/숙소/식사 타입 분류 정확도 향상.

## 주의 / 한계
- 인라인 이미지(`wp:inline`, 밴드 붙여넣기 대부분)에서 신뢰성 높음.
- 표 안/떠있는(anchored) 이미지는 문서상 "위"가 모호 → 캡션 오매칭 가능. 길이 캡으로 완화.
- 자동 캡션이 틀려도 등록 후 수정화면 `MediaManager`의 `CaptionEditor`에서 편집 가능.
- 연락처 제거는 서버에서 `stripContacts(caption)` 로 일괄 처리(클라는 단순 유지).

## 변경 파일
- `src/components/admin/QuickProductForm.tsx`
- `src/app/api/admin/products/quick/route.ts`
