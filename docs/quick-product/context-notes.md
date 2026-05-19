# 빠른 상품 등록 컨텍스트 노트 (결정·근거)

## 2026-05-19 (계획)

- **Option A 채택(사용자):** 본문 textarea + 이미지 파일 드롭. "이미지까지 한 번에 복붙"은 클립보드 제약(비공개 밴드 CDN 참조·Word 제각각)으로 신뢰 불가라 파일 드롭이 유일하게 견고. Option B(이미지 붙여넣기)는 미선택·범위 제외.
- **클라이언트→Blob 직행 업로드 결정:** Vercel 함수 요청 본문 ~4.5MB 한도. 밴드 글 이미지 20~50장은 단일 multipart로 불가. `@vercel/blob/client` `upload()` + 서버 `handleUpload` 토큰 브로커가 Vercel 공식 패턴이며 한도 회피. 생성 API엔 텍스트+URL(소형 JSON)만.
- **수동 등록이라 autoImported=false, sourceUrl=null:** 크롤(test:// / autoImported=true)과 구분. 기존 ProductForm 수동 경로와 동일 규약.
- **생성 후 edit 이동:** 기존 ProductForm 생성 동작과 일관. 분류 부정확·캡션은 MediaManager에서 보정(허용 degrade).
- **복원력:** 이미지 업로드 실패는 건너뛰고 상품은 생성(이미지 한 장이 등록 전체를 막지 않음 — sitemap/storeFromUrl과 동일 원칙). parseProduct 실패는 상품 미생성 + 사유 반환(잘못된 데이터 생성 방지).
- **이미지 분류 한계:** classifyImage는 url/파일명+본문 컨텍스트 기반. 밴드 이미지 파일명 무의미 시 본문으로만 분류 → 대략값. 생성 후 어드민 보정 전제.
- **의존:** public Blob 스토어·토큰([[image-hosting]] 완료). 1순위 BAND 키와 무관하게 지금 가치 있음(수동 등록 가속).

## 2026-05-19 (구현·검증)

- 4파일 신규 + 진입버튼. `npm run build` 통과, 커밋 `b4b1dcb` 배포.
- **검증:** API 게이트 비로그인 403(quick·blob-upload 둘 다), GET=405(POST전용), 정적 `quick`가 `[id]` 동적보다 우선(=`[id]`는 PATCH/DELETE만이라 POST 403은 내 라우트가 처리 증명). 페이지는 비로그인 404 — 기존 `/admin/products`도 동일하므로 어드민 가드 일관(정상).
- **배포 폴링 교훈:** 첫 405 신호에 폴링이 발동했으나 그건 전파 중 상태(blob-upload가 잠깐 200으로 보임). 전파 후 재확인하니 전부 정상. → 배포 검증은 단일 신호 말고 전파 완료 후 재확인 필요(false positive 주의).
- **남은 e2e:** 인증 후 실제 본문+이미지 등록은 브라우저 필요 → 사용자 확인 항목. 서버 로직은 기존 검증된 조각 재조합.
