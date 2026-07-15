# 모바일 앱 출시 플랜 — Android 먼저

## 목표

기존 Next.js(Vercel) 웹앱을 **Capacitor**로 감싸 Google Play(Android)에 먼저 출시한다. iOS는 Mac 확보 후 같은 코드 기반으로 추가한다.

## 왜 Capacitor인가

- 기존 코드 100% 재사용. 별도 모바일 코드베이스 없음.
- `server.url`을 Vercel 도메인으로 설정하면 **앱 콘텐츠 = 웹 콘텐츠**. 웹에 배포만 하면 앱도 즉시 갱신(스토어 재심사 불필요).
- 푸시·카메라·딥링크 같은 네이티브 API는 플러그인으로 점진적 추가 가능.
- Android는 Windows에서 빌드 가능. iOS는 Mac 필요해서 나중에 처리.

대안 비교는 [context-notes.md](./context-notes.md) 참고.

## 아키텍처

```
[ Google Play Store ]
        |
        v
[ Capacitor Android Shell ]  ← APK/AABf
        |
        | (WebView, server.url)
        v
[ Vercel 배포 Next.js 앱 ]   ← 기존 코드 그대로
        |
        v
[ Neon DB / NextAuth / BAND API ]
```

- WebView 안에 Vercel 도메인 로딩.
- 일부 UI(스플래시·상태바·푸시 알림)만 네이티브 영역.

## 범위

**1차 출시(Android)에 포함**

- Capacitor Android 셸
- 앱 아이콘 · 스플래시
- 기본 권한(인터넷)
- BAND OAuth 등 외부 redirect 처리(시스템 브라우저로 위임)
- Google Play 비공개 테스트 트랙 업로드

**1차 출시에서 제외(나중)**

- iOS 앱 (Mac 확보 후)
- 푸시 알림 (FCM 셋업 별도 단계)
- 카메라 / 위치 권한
- 인앱 결제

## 큰 위험과 대응

| 위험 | 대응 |
| --- | --- |
| Google Play 신규 개인 개발자 계정의 **테스터 20명·14일 비공개 테스트** 의무화 | 사업자 등록 가능하면 회사 계정으로 등록, 아니면 14일 일정 미리 확보 |
| 개인정보처리방침 URL 필수 | 별도 `/privacy` 페이지 작성 후 Vercel에 배포 |
| BAND OAuth가 WebView 안에서 막힘 | `@capacitor/browser`로 시스템 브라우저 열어 인증 후 딥링크 복귀 |
| WebView에서 새 창(`target=_blank`) 처리 안 됨 | Capacitor 설정으로 외부 링크는 OS 브라우저로 위임 |
| 키스토어 분실 시 영원히 동일 앱 업데이트 불가 | 키스토어와 비밀번호를 별도 보관소(1Password 등)에 백업 |

## 단계별 진행 순서

1. **Capacitor 설치 & 설정** → `npx cap doctor` 통과
2. **Android 프로젝트 생성** → Android Studio에서 열림
3. **앱 아이콘·스플래시 생성** → `@capacitor/assets`로 일괄
4. **앱명·패키지명·권한 설정** → AndroidManifest.xml
5. **로컬 디버그 빌드** → 에뮬레이터 or 실기기에서 동작 확인
6. **외부 redirect/OAuth 처리** → BAND 로그인이 앱 내에서 끝까지 동작
7. **개인정보처리방침 페이지** → Vercel에 배포
8. **서명 키스토어 생성 & 백업**
9. **릴리즈 AAB 빌드**
10. **Google Play Console 등록 ($25)**
11. **앱 정보·스크린샷·심사용 자료 작성**
12. **비공개 테스트 트랙 업로드 → 테스터 모집 → 14일 운영**
13. **공개 출시 심사 제출**

세부 체크리스트는 [checklist.md](./checklist.md).

## 비용 요약

- Google Play Developer 등록: **$25 1회**
- Apple Developer 등록: **$99/년** (iOS 시작할 때)
- Vercel: 기존 그대로
- 클라우드 Mac 빌드(나중 iOS): Codemagic/EAS 등 무료 티어로 시작 가능

## 일정 가늠

- 1~5단계(로컬 빌드 동작): **1~2일**
- 6~8단계(OAuth·정책페이지·키스토어): **1일**
- 9~11단계(릴리즈·등록·자료): **1~2일**
- 12단계(테스트 14일): **약 2주, 강제 대기**
- 13단계(심사): **수 시간~며칠**

= **계정이 회사면 약 1주 내 출시 가능, 개인이면 약 3주**
