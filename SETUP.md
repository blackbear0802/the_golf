# 새 머신 셋업 가이드

집·노트북·다른 PC 어디서든 작업 이어가기 위한 단계.

## 0. 필수 도구
- Node.js 20 LTS 이상
- Git
- (Windows) PowerShell 7 또는 WSL — 한글 출력 깨짐 방지하려면 `chcp 65001`로 UTF-8 코드페이지
- (선택) VS Code, Claude Code

## 1. 코드 받기
```bash
git clone https://github.com/blackbear0802/the_golf.git
cd the_golf
npm install
```

## 2. 환경변수 채우기

루트에 `.env` 파일 생성. 템플릿은 `.env.example` 참고.

| 변수 | 값을 어디서 | 비고 |
|------|------------|------|
| `DATABASE_URL` | Neon 대시보드 → Connection Details (pooler) | 모든 머신에서 동일 |
| `NEXTAUTH_SECRET` | Vercel → Settings → Environment Variables | 모든 머신에서 동일해야 세션 유지됨 |
| `NEXTAUTH_URL` | 로컬은 `http://localhost:3005`, 배포는 `https://the-golf-v2.vercel.app` | 머신별로 다를 수 있음 |
| `ANTHROPIC_API_KEY` | Anthropic 콘솔 | 밴드 크롤러 로컬 테스트할 때만 필요 |
| `CRON_SECRET` | Vercel 환경변수 | 로컬 크론 호출 테스트할 때만 필요 |

빠른 동기화 팁: Vercel CLI 사용
```bash
npm i -g vercel
vercel link        # 한 번만, 프로젝트 연결
vercel env pull .env   # Vercel에 등록된 env를 .env로 내려받음
```

## 3. Prisma 클라이언트 생성
```bash
npx prisma generate
```
> `prisma db push`는 이미 운영 DB에 반영돼 있으므로 다시 실행 불필요. 스키마 변경 시에만 push.

## 4. 개발 서버 실행
```bash
npm run dev
```
브라우저 → http://localhost:3005

어드민 접근: 로그인 후 `lupang3th@gmail.com` 계정만 `/admin` 진입 가능. 다른 계정으로 테스트하려면.
```bash
npx tsx scripts/promote-admin.ts your@email.com
```

## 5. Claude Code 작업 컨텍스트

`C:\Users\<USER>\.claude\projects\E--PJT-the-golf\memory\` 폴더는 머신별로 분리됨 — 새 머신에서 Claude Code를 처음 띄우면 이전 메모리가 없음.

대처법.
- 옵션 A. 새 머신에서 "현재 프로젝트 상태 요약해" 한 번 시켜 메모리 재구축
- 옵션 B. 메모리 폴더 통째로 USB/OneDrive로 복사
- 옵션 C. 핵심 결정은 git 추적 가능한 `docs/` 안에 저장 (현재 `docs/band-crawler/checklist.md` 같은 방식)

## 6. 자주 쓰는 명령
```bash
npm run dev         # 개발 서버
npm run build       # 프로덕션 빌드 (prisma generate 포함)
npm run db:push     # 스키마 변경 후 DB 반영
npm run db:studio   # Prisma Studio (GUI)
npx tsc --noEmit    # 타입 검사만
```

## 7. 배포

`main` 브랜치 push 시 Vercel 자동 배포. 별도 명령 불필요.

## 트러블슈팅

- **한글 깨짐 (Windows PowerShell)**: `chcp 65001` 실행 후 콘솔 폰트를 한글 지원 폰트(D2Coding 등)로 변경
- **Prisma "Module not found"**: `npx prisma generate` 다시 실행
- **NextAuth 세션 안 됨**: `NEXTAUTH_SECRET`이 머신마다 달라서 그럼 — Vercel과 동일 값 사용
- **DB 접속 실패**: Neon은 inactive 15분 후 자동 sleep — 첫 요청은 느릴 수 있음
