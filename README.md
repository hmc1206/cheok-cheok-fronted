# 척척 (Cheok-Cheok) — 시니어 음성 생활 도우미 프론트엔드

어르신의 음성 요청을 이해해 앱을 실행하거나, 자동 처리가 불가능한 과업(예매·키오스크 등)은 화면과 음성으로 한 단계씩 안내하는 React 기반 웹 프론트엔드입니다.

## 기술 스택

| 구분 | 사용 기술 |
| --- | --- |
| 프레임워크 | React 19 + Vite 8 |
| 라우팅 | React Router 7 |
| 상태 관리 | Zustand |
| HTTP 클라이언트 | Axios |
| 스타일 | Tailwind CSS 4 |
| 애니메이션 | Framer Motion |
| 린트 | Oxlint |

## 아키텍처

```
음성/텍스트 입력 → useVoiceAssistant → POST /voice/process → intent 기반 화면 라우팅
```

- **단일 대화 진입점**: 평상시 프론트는 `POST /voice/process` 한 곳만 호출하고, 서버가 `intent`, `step`, `ttsText`, `screen`, `quickReplies`를 담은 공통 응답 봉투를 내려줍니다.
- **인증**: 구글 OAuth 서버사이드 리다이렉트 방식(`/login` → `/oauth2/authorization/google` → `/auth/callback?token=...`). JWT는 Zustand(`authStore`)에 보관하고, Axios 인터셉터(`apiClient.js`)가 요청마다 자동으로 `Authorization` 헤더를 붙입니다. 401 발생 시 `/auth/refresh`로 1회 재시도 후 실패하면 재로그인으로 유도합니다.
- **딥링크 폴백**: 유튜브·네이버 지도 등 외부 앱은 앱 URL 실행을 우선 시도하고, 실패 시 웹 URL로 폴백합니다(`lib/deepLink.js`).
- **접근성 우선 UX**: 자유 입력보다 큰 `quickReplies` 버튼을 우선하며, `ttsText`는 화면 표시와 동시에 음성으로 읽어줍니다.

## 폴더 구조

```
src/
├── api/          # 도메인별 API 모듈 (voice, auth, kiosk, routes, youtube 등)
├── components/
│   ├── common/   # 공통 UI (마이크 권한, 캡션 오버레이, 진행 표시 등)
│   ├── kiosk/    # 키오스크 카메라/화면 감지
│   └── ui/       # 시니어 전용 버튼·입력 컴포넌트
├── data/         # 키오스크 정적 데이터
├── hooks/        # useVoiceAssistant, useSTT, useTTS, useGeolocation 등
├── lib/          # 딥링크, 위치, 마이크 권한 유틸
├── screens/      # 라우트별 화면 컴포넌트
├── store/        # Zustand 스토어 (auth, voiceSession, kioskOrder, theme 등)
└── styles/       # 전역 CSS, 디자인 토큰
```

## 주요 화면(라우트)

| 경로 | 화면 | 설명 |
| --- | --- | --- |
| `/` | SplashScreen | 앱 첫 진입점, 일정 시간 후 `/login`으로 이동 |
| `/login` | LoginPage | 구글 로그인 |
| `/home` | HomeScreen | 로그인 후 메인 홈 |
| `/map` | MapRouteScreen | 길찾기(네이버 지도 연동) |
| `/nearby-place` | NearbyPlaceScreen | 근처 병원·약국 찾기 |
| `/weather` | WeatherScreen | 오늘의 날씨 |
| `/kiosk` | KioskLiveScreen | 키오스크 단계별 안내 |
| `/youtube` | YoutubePlayerScreen | 유튜브 재생/검색 연결 |
| `/settings`, `/settings/allowed-apps` | SettingsScreen 등 | 환경설정 |
| `/subscription`, `/usage-limit` | 구독/이용 한도 | — |

## 시작하기

```bash
npm install
npm run dev       # 개발 서버 (기본 5173 포트 — 백엔드 CORS/로그인 콜백이 이 포트를 가정)
npm run build      # 프로덕션 빌드
npm run lint        # Oxlint 검사
npm test              # kioskOrderStore 단위 테스트
```

### 환경 변수

| 변수 | 설명 |
| --- | --- |
| `VITE_API_BASE_URL` | 백엔드 Base URL. `/api` 접미사는 붙이지 않으며, 각 API 모듈이 필요 시 경로에 직접 `/api`를 포함합니다. |

- `.env`: 로컬 개발용(`http://localhost:8080`)
- `.env.production`: 배포용(`https://api.chuckchuck.com`)


자세한 제품 요구사항과 API 계약은 `docs/PROJECT_CONTEXT.md`(v2.0, 2026-08-08 기준)를 최신 기준 문서로 참고하세요.
