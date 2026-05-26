# 빠른 등록 — Word 이미지 캡션 자동 추출 체크리스트

목표 — .docx 빠른 등록 시 **각 이미지 바로 위 문단 텍스트**를 해당 이미지의 캡션으로 자동 수집해 DB에 저장.

## 구현
- [x] `QuickProductForm.tsx` — docx 파서를 **문서 순서** 파싱으로 재작성
  - [x] `word/_rels/document.xml.rels` 읽어 `rId → media 파일경로` 맵 구성(이미지 확장자만)
  - [x] 문단(`<w:p>`) 순회하며 텍스트 블록 / 이미지 블록 순서대로 수집
  - [x] 각 이미지의 "바로 위" 텍스트 블록을 캡션으로 페어링(연속 이미지는 캡션 없음)
  - [x] 캡션 길이 캡(80자 초과 → 본문으로 보고 캡션 미부여)
  - [x] 문서에서 미참조된 `word/media/*` 이미지는 캡션 없이 뒤에 append(기존 "전부 포함" 유지)
- [x] `QuickProductForm.tsx` — 상태 `files: File[]` → `{file, caption}[]`
  - [x] addFiles(드래그/수동)는 caption 빈 문자열
  - [x] removeFile / 썸네일 렌더 / handleSubmit 업로드 루프 갱신
  - [x] 썸네일에 캡션 미리보기 표시(수집됐음을 확인 가능)
  - [x] 제출 시 `images: {url, caption}[]` 로 전송
- [x] `api/admin/products/quick/route.ts`
  - [x] `images: {url, caption}[]` 수용(+ 레거시 `imageUrls: string[]` 폴백)
  - [x] mediaRows에 `caption` 저장(`stripContacts` 후 빈값이면 null)
  - [x] `classifyImage(url, caption, text)` 에 캡션 전달(타입 분류 정확도↑)

## 검증
- [x] `npx tsc --noEmit` 타입 통과(EXIT 0) · eslint 통과(EXIT 0)
- [x] 합성 Word XML로 캡션 페어링 단위검증 PASS(인라인/빈문단/갤러리/하이퍼링크 케이스)
- [ ] 등록 후 수정화면(MediaManager)에서 캡션 표시 확인 — 라이브 수동 확인 권장
