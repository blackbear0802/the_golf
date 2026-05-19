# 이미지 호스팅 컨텍스트 노트 (결정·근거)

## 2026-05-19 (계획 수립)

- **제공자 Vercel Blob 선택:** media-storage.ts 스텁 주석이 이미 "2단계에서 Vercel Blob 이관"으로 의도를 박아둠 → 프로젝트 합의된 방향, 투기 아님. Vercel 호스팅이라 네이티브·공개 URL·설정 최소. S3/R2/Cloudinary는 외부 계정/복잡도라 보류.
- **호출부 무변경 설계:** band-crawler·test 스크립트가 이미 `storeFromUrl` 반환값을 `ProductMedia.url`에 저장. 따라서 이 함수 본문만 교체하면 전 경로가 동작 — 파급 최소, CLAUDE.md surgical 부합.
- **폴백 우선:** fetch/업로드/토큰 실패 시 throw 대신 원본 URL 반환. 이유: 이미지 한 장 실패가 크롤/상품 생성 전체를 막으면 안 됨(sitemap try/catch와 동일 복원력 원칙). 단점: 폴백 시 이미지 안정성 미확보 → 토큰 설정은 사실상 필수.
- **사용자 선행 필수:** Blob 스토어 생성은 Vercel 대시보드 작업이라 에이전트 불가. BAND 키와 동일하게 사용자 의존 단계로 분리.
- **검증 한계 명시:** 진짜 대상(밴드 CDN URL)은 OAuth 크롤 가동 후라야 검증 가능. 그 전엔 임의 공개 이미지 URL로 storeFromUrl 단위 검증까지만. 1순위(BAND 키)와 의존 관계 — 이 작업은 1순위 풀리면 가치 실현.
- **비목표 명시:** 리사이즈/최적화·기존 상품 마이그레이션·docx 이미지 추출·dedup 제외(범위 폭주 방지).

## 2026-05-19 (구현·검증 중 블로커)

- `@vercel/blob ^2.4.0` 설치, `storeFromUrl` 구현(fetch→put public, 실패/토큰없음 시 원본 URL 폴백), `.env.example` 항목 추가. `npm run build` 통과.
- **블로커(계측으로 확정):** 사용자가 만든 Blob 스토어가 **private**. `put(access:"public")`가 "Cannot use public access on a private store"로 거부됨. 토큰·fetch·업로드 코드는 정상(진단 시 fetch 200·5309B까지 정상, put에서만 실패).
- **해결:** 상품 이미지는 브라우저가 `<img src>`로 직접 받는 공개 이미지라 **public 스토어** 필수(private은 함수 프록시+전송비↑로 부적합). Vercel Blob 스토어 access는 생성 시 결정이라 보통 사후 변경 불가 → **public 스토어 새로 생성→프로젝트 연결→새 BLOB_READ_WRITE_TOKEN을 .env/Vercel에 반영**. 코드는 그대로(`access:"public"` 정답), 폴백 덕에 그 전까지 배포·크롤 무해.
- **검증 완료:** public 스토어 토큰으로 재검증 → `storeFromUrl`이 `https://<id>.public.blob.vercel-storage.com/products/...jpg` 반환, 그 URL HTTP 200·image/jpeg·바이트 일치. 단위 레벨 정상.
- **남은 e2e 갭(블로커 의존):** 진짜 대상(밴드 포스트 이미지 다수)은 `band-crawler` 경유이고 그건 BAND OAuth(1순위)가 풀려야 가동. test-parse-pipeline는 텍스트 전용이라 이미지 경로 미경유. 따라서 storeFromUrl 단위 검증까지가 현 단계 한계 — band-crawler→productMedia 배선은 기존 검증된 코드라 무변경.
- **사용자 확인 필요:** 옛 private 스토어 연결 잔존 시 Vercel Production env가 옛 토큰일 수 있음 → private 스토어 삭제 + Production `BLOB_READ_WRITE_TOKEN`이 새 public 값인지 확인해야 배포 환경에서 실제 동작.
