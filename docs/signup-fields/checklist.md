# 회원가입 추가 항목 — 체크리스트

## 결정 사항
- 약관만 필수. 생년월일/성별/구력/핸디캡/거주지역은 모두 선택.
- 약관: 이용약관(필수) + 개인정보처리(필수) + 마케팅 수신(선택), 전체동의 체크박스 포함.

## 작업
- [x] `prisma/schema.prisma` — Gender enum + User 컬럼 8개 추가
- [x] `npm run db:push` 로 Neon 반영 + prisma generate
- [x] `src/lib/signup-options.ts` — 성별/구력/핸디캡/지역 옵션·라벨 맵
- [x] `src/lib/validators.ts` — validateBirthDate(선택) 추가
- [x] `src/app/api/auth/signup/route.ts` — 새 필드 수신·약관 필수 검증·저장
- [x] `src/app/register/page.tsx` — 선택 정보 섹션 + 약관 동의 UI
- [x] `src/app/admin/members/[id]/page.tsx` — 상세에 새 항목 표시
- [x] `npm run build` 통과 확인
