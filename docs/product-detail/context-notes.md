# 상품 상세 재구성 컨텍스트 노트

## 2026-05-19

- 사용자 결정: 본문=stripContacts(rawText) 그대로, 포함/불포함 유지+본문 추가.
- 히어로 제거 결정(에이전트): 요청 레이아웃에 히어로 언급 없음 + 스택과 첫 이미지 중복 → 제거가 의도에 부합. 보고에 명시(원하면 되돌림).
- 정렬은 쿼리 대신 JS `sort((a,b)=>a.order-b.order)` — 쿼리 orderBy 변경 시 다른 분기 영향 우려 회피(surgical).
- youtubeVideos 섹션 유지(이미지 스택 뒤). 포함/불포함은 영상 뒤 유지.
- rawText 없는 상품(과거 수동 생성 등)은 본문 섹션 자동 생략(폴백).
- (추가) Word HYPERLINK 필드코드·깨진 band.us 미디어/해시태그 링크는 이미지로 복원 불가(band.us 인증 벽·malformed). → 공유 `cleanPostText`로 본문에서 제거. 상세 표시·빠른등록 저장/AI 입력 모두 적용. 단위검증 통과. 실제 이미지는 [[quick-product]]의 .docx 임베드 추출/드롭존으로 공급.
