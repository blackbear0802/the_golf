# 모바일 앱 체크리스트 — Android 1차 출시

진행하면서 `[x]`로 체크.

## 1단계 — Capacitor 설치

- [ ] `npm i -D @capacitor/cli @capacitor/assets`
- [ ] `npm i @capacitor/core @capacitor/android @capacitor/browser @capacitor/app`
- [ ] `npx cap init` 실행
  - app name: `더 골프`
  - package id: `com.thegolf.app` (확정 전 [context-notes](./context-notes.md) 참고)
- [ ] `capacitor.config.ts`에 `server.url = https://<vercel-domain>` 설정
- [ ] `capacitor.config.ts`에 `server.cleartext = false`, `androidScheme = 'https'`

## 2단계 — Android 프로젝트 생성

- [ ] Android Studio 설치 (Windows)
- [ ] Android SDK 34+, build-tools 설치
- [ ] `npx cap add android`
- [ ] `npx cap open android` → Android Studio에서 정상 열림 확인
- [ ] Gradle sync 성공

## 3단계 — 앱 아이콘·스플래시

- [ ] `resources/icon.png` 1024x1024 준비
- [ ] `resources/splash.png` 2732x2732 준비 (디자인 토큰 색상 반영)
- [ ] `npx capacitor-assets generate --android` 실행
- [ ] 생성된 `android/app/src/main/res/mipmap-*` 확인

## 4단계 — Manifest 설정

- [ ] `AndroidManifest.xml` — `android:label` 한글 앱명 적용
- [ ] `versionCode` / `versionName` 초기값 설정
- [ ] 외부 링크 처리 (`@capacitor/browser`)로 시스템 브라우저 위임
- [ ] 딥링크 intent-filter 추가 (BAND OAuth 콜백용)
- [ ] 인터넷 권한 외 불필요한 권한 제거

## 5단계 — 로컬 디버그 빌드

- [ ] `npx cap sync android`
- [ ] Android Studio → Run → 에뮬레이터에서 실행
- [ ] 메인 화면 로딩 확인
- [ ] AI 챗 동작 확인
- [ ] 상품 목록·상세 페이지 동작 확인
- [ ] 예약 플로우 동작 확인

## 6단계 — OAuth·외부 리다이렉트

- [ ] BAND 로그인 → 시스템 브라우저로 전환되는지 확인
- [ ] 인증 후 앱으로 돌아오는 딥링크 동작 확인
- [ ] 결제·외부 폼 같은 다른 외부 링크도 시스템 브라우저로 열리는지 점검

## 7단계 — 개인정보처리방침 페이지

- [ ] `/privacy` 페이지 작성 (회사명·수집항목·연락처·BAND 데이터 사용 등)
- [ ] Vercel에 배포 후 URL 확보
- [ ] Play Console 등록 시 사용

## 8단계 — 서명 키스토어

- [ ] `keytool`로 release keystore 생성
- [ ] 비밀번호·alias·alias 비밀번호 별도 안전 보관 (1Password 권장)
- [ ] `android/app/build.gradle`에 signing config 추가
- [ ] `android/keystore.properties` 작성하고 `.gitignore`에 추가
- [ ] 키스토어 파일 자체도 클라우드 백업 (분실하면 동일 앱 업데이트 불가)

## 9단계 — 릴리즈 AAB 빌드

- [ ] Android Studio → Build → Generate Signed Bundle → AAB
- [ ] `app-release.aab` 생성 확인
- [ ] 사이즈 확인 (보통 5~15MB)

## 10단계 — Google Play Console

- [ ] [play.google.com/console](https://play.google.com/console) 등록 ($25)
- [ ] 개발자 프로필 작성 (개인 vs 회사 결정)
- [ ] 앱 만들기 → 앱 이름·기본 언어·앱/게임·유료/무료 설정

## 11단계 — 스토어 자료

- [ ] 앱 아이콘 512x512 (PNG)
- [ ] 그래픽 이미지 1024x500
- [ ] 휴대전화 스크린샷 최소 2장 (16:9 또는 9:16)
- [ ] 짧은 설명 (80자)
- [ ] 자세한 설명 (4000자)
- [ ] 카테고리: 여행/지역정보
- [ ] 개인정보처리방침 URL 입력
- [ ] 데이터 보안 설문 작성
- [ ] 콘텐츠 등급 설문

## 12단계 — 비공개 테스트

- [ ] 비공개 테스트 트랙에 AAB 업로드
- [ ] 테스터 그룹 만들기 (Google 그룹 또는 이메일 목록)
- [ ] **테스터 20명 모집** (개인 계정인 경우)
- [ ] **14일간 활성 테스트 유지**
- [ ] 테스트 피드백 반영하여 수정 시 versionCode 올리고 재업로드

## 13단계 — 공개 출시

- [ ] 프로덕션 트랙으로 승격
- [ ] 심사 제출
- [ ] 심사 완료 후 단계적 출시 비율 조정 (10% → 50% → 100%)

## 보너스 — iOS 준비(나중)

- [ ] Mac 확보 또는 클라우드 Mac 빌드 결정
- [ ] Apple Developer 가입 ($99/년, D-U-N-S 등 회사 자료 필요할 수 있음)
- [ ] `npx cap add ios`
- [ ] 이후 단계는 별도 체크리스트로 분리
