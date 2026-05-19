# 이미지 호스팅(Vercel Blob) 도입 계획

## 배경 / 문제
`src/lib/media-storage.ts`의 `storeFromUrl`은 입력 URL을 그대로 반환하는 스텁(주석에 "2단계에서 Vercel Blob 이관" 명시). 결과:
- 밴드 OAuth 크롤이 가동돼도 밴드 CDN 원본 URL을 그대로 저장 → 핫링크 차단·만료·인증 시 상품 페이지 이미지 깨질 위험
- docx/로컬 등 비공개 이미지는 아예 표시 불가
- 이미지 파이프라인 사실상 비검증·비신뢰

## 목표
원격 이미지 URL을 받아 **우리 소유 스토리지(Vercel Blob)에 복사 후 안정적 공개 URL 반환**. 호출부(band-crawler, test 스크립트)는 무변경 — 이미 `storeFromUrl` 반환값을 `ProductMedia.url`에 저장하므로 이 함수만 교체하면 전체가 동작.

## 방식 (제안)
- **제공자: Vercel Blob** (`@vercel/blob`). 근거: 이미 Vercel 호스팅, 네이티브 SDK·공개 URL, 스텁 주석의 기존 의도와 일치. 대안(S3/R2/Cloudinary)은 외부 계정·복잡도 추가라 보류.
- `storeFromUrl(url)`: 원격 fetch → content-type/확장자 판별 → `put()`로 Blob 업로드(`access:"public"`) → Blob 공개 URL 반환.
- **복원력**: fetch/업로드 실패 시 원본 URL 폴백(크롤 전체를 막지 않음). 프로젝트의 기존 graceful-degradation 패턴(sitemap try/catch 등)과 동일 원칙.
- 경로 규칙: `products/<해시 또는 타임스탬프>-<원본파일명>` 정도. 중복 업로드 dedup은 MVP 비목표(필요 시 후속).

## 영향 범위
- `src/lib/media-storage.ts` (storeFromUrl 본문 교체, storeManyFromUrls 자동 수혜)
- `package.json` (`@vercel/blob` 추가)
- 환경변수 `BLOB_READ_WRITE_TOKEN` (Vercel 런타임 자동 주입 / 로컬 .env 수동)
- 호출부 코드 변경 **없음**

## 사용자 선행 작업 (나 대신 불가)
- Vercel 대시보드 → Storage → **Blob 스토어 생성** 후 프로젝트(the_golf) 연결
- `BLOB_READ_WRITE_TOKEN` 확인 → 로컬 `.env`에 추가(로컬 크롤/스크립트 테스트용). Vercel Production은 스토어 연결 시 자동 주입.

## 비목표
- 이미지 리사이즈/최적화(표시단 next 처리 별개), 기존 상품 이미지 URL 마이그레이션, docx 임베드 이미지 추출, dedup.

## 리스크
- Vercel Hobby Blob 무료 한도(용량/대역폭). band-crawler가 포스트당 20장 캡이 있어 폭주 위험은 제한적이나 모니터링 필요.
- 토큰 미설정 시: 폴백으로 원본 URL 반환(기능 degrade하되 크롤은 지속). 동작은 하되 이미지 안정성 미확보 — 토큰 설정이 사실상 필수.
- 검증 한계: 실제 밴드 CDN URL은 OAuth 크롤 가동 후라야 진짜 검증 가능. 그 전엔 임의 공개 이미지 URL로 storeFromUrl 단위 검증.
