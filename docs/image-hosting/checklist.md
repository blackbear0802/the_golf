# 이미지 호스팅 체크리스트

## 0. 사용자 선행 (블로킹)
- [ ] Vercel 대시보드 Storage → Blob 스토어 생성 + the_golf 연결
- [ ] `BLOB_READ_WRITE_TOKEN` 로컬 `.env` 추가 (Vercel Prod는 자동 주입 확인)

## 1. 의존성
- [ ] `npm i @vercel/blob`
- [ ] `.env.example`에 `BLOB_READ_WRITE_TOKEN` 항목·설명 추가

## 2. 구현 (media-storage.ts만)
- [ ] `storeFromUrl`: 원격 fetch → 실패 시 원본 URL 폴백
- [ ] content-type/확장자 판별 → `put(path, blob, { access: "public" })`
- [ ] Blob 공개 URL 반환, 업로드 실패도 원본 URL 폴백 (throw 금지)
- [ ] 토큰 미설정 감지 시 즉시 폴백(경고 로그 1회)
- [ ] `storeManyFromUrls` 무변경(자동 수혜) 확인

## 3. 검증
- [ ] 단위: 임의 공개 이미지 URL → Blob URL 반환·실제 접근 200
- [ ] 폴백: 잘못된 URL/토큰 없음 → 원본 URL 반환, 예외 없음
- [ ] `npm run build` 통과
- [ ] test-parse-pipeline `--commit`로 이미지 포함 글 1건 → ProductMedia.url이 Blob URL인지 + 상품 페이지 렌더 확인
- [ ] (OAuth 크롤 가동 후) 실제 밴드 CDN 이미지 재검증 — 후속

## 4. 마무리
- [ ] 커밋·푸시·자동배포·라이브 확인
- [ ] context-notes 결정 기록, 메모리 갱신([[project-band-crawl]] 이미지 스텁 항목 해소)
