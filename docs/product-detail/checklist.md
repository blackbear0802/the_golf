# 상품 상세 재구성 체크리스트

- [x] `stripContacts` import 추가
- [x] 이미지 변수 정리: golf/accommodation/dining/heroImage 제거 → `orderedImages`(type!=youtube, order asc) + `bodyText`(stripContacts(rawText))
- [x] 히어로 이미지 블록 제거
- [x] 본문 섹션 추가(rawText 있을 때만, whitespace-pre-wrap)
- [x] 이미지 스택 섹션(풀폭 세로, 캡션) — 기존 MediaGallery ×3 호출 대체
- [x] 유튜브/포함·불포함/CTA 유지, 순서 본문→이미지→영상→포함/불포함
- [x] `MediaGallery` 함수 제거(고아)
- [x] `npm run build` 통과
- [x] 커밋·푸시·자동배포·라이브 상세페이지 확인(본문 노출·연락처 제거·이미지 세로순서)
- [x] context-notes 기록
