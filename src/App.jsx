import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { MicPermissionGate } from './components/common/MicPermissionGate'
import { ThemeProvider } from './components/common/ThemeProvider'
import { useAuthStore } from './store/authStore'
import { AllowedAppsEditScreen } from './screens/AllowedAppsEditScreen'
import { AuthCallbackScreen } from './screens/AuthCallbackScreen'
import { ChatScreen } from './screens/ChatScreen'
import { GuardianMonitoringScreen } from './screens/GuardianMonitoringScreen'
import { HomeScreen } from './screens/HomeScreen'
import { KioskLiveScreen } from './screens/KioskLiveScreen'
import { LoginPage } from './screens/LoginPage'
import { MapRouteScreen } from './screens/MapRouteScreen'
import { NearbyPlaceScreen } from './screens/NearbyPlaceScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { SplashScreen } from './screens/SplashScreen'
import { SubscriptionScreen } from './screens/SubscriptionScreen'
import { UsageLimitScreen } from './screens/UsageLimitScreen'
import { YoutubePlayerScreen } from './screens/YoutubePlayerScreen'

// 기획서 2장 라우트 표를 그대로 반영한 라우터 뼈대.
// 구글 로그인: 백엔드에 실제 구현된 방식은 서버사이드 리다이렉트다.
// (/login에서 GET /oauth2/authorization/google로 이동 → 구글 인증 →
// 백엔드가 /auth/callback?token=...&isNewUser=...로 리다이렉트)
// 클라이언트 팝업(@react-oauth/google) 방식은 백엔드에 없다고 확인되어 제거함.
//
// 버그 수정: 루트 경로("/")가 HomeScreen에 매핑되어 있어, 앱에 처음 접속하면
// 로그인/스플래시 화면을 거치지 않고 바로 홈으로 들어가는 문제가 있었다.
// "/"를 LoginPage로, 로그인 이후 진입하는 실제 홈 화면은 "/home"으로 옮긴다.
// "/login"은 apiClient 인터셉터 등 기존에 하드코딩된 참조가 있어 같은
// LoginPage를 가리키는 별칭으로 그대로 남겨둔다.
//
// 스플래시 화면 추가: "/"가 LoginPage를 직접 가리키던 걸 SplashScreen으로
// 바꿨다 — SplashScreen이 일정 시간 후 자체적으로 /login으로 이동시킨다
// (SplashScreen.jsx 참고). "/login"은 그대로 LoginPage를 가리키므로, 이미
// 인증된 사용자가 세션 안에서 다시 "/login"에 직접 접근하는 기존 흐름(예:
// apiClient 401 처리 시 재로그인 유도)은 스플래시를 다시 거치지 않는다 —
// 스플래시는 "/"(앱의 첫 진입점)에만 있다.
function App() {
  // 로그인 여부(토큰 존재)로 마이크 권한 확인 시점을 미룬다. 원래는 앱이 뜨자마자
  // (스플래시/로그인 화면 위에도) 항상 확인했는데, 마이크 권한 모달이 스플래시의
  // 첫인상 애니메이션 위에 바로 겹쳐 보이는 문제가 있어(사용자 확인) 로그인 이후로
  // 미뤘다 — 실제로 마이크를 쓰는 기능(음성 비서)도 전부 로그인 후 화면에만
  // 있어서, 로그인 전에는 물어볼 이유도 없었다.
  const token = useAuthStore((state) => state.token)

  return (
    <ThemeProvider>
      <BrowserRouter>
        {/* 앱 최상단 마운트 지점 — 라우트가 바뀌어도 다시 만들어지지 않도록 Routes
            바깥에 딱 한 번만 둔다. 마이크 권한 상태는 전역(Zustand)이라 여기 위치는
            "로그인 후 한 번 확인"이라는 타이밍 요구사항 때문일 뿐, 화면별로 따로
            둘 필요는 없다. */}
        {token && <MicPermissionGate />}
        <Routes>
          <Route path="/" element={<SplashScreen />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/home" element={<HomeScreen />} />
          {/* 홈 화면 "눌러서 말하기" 카드에서 진입하는 음성 채팅 페이지 */}
          <Route path="/chat" element={<ChatScreen />} />
          <Route path="/map" element={<MapRouteScreen />} />
          {/* 기차 예매(TRAIN_BOOKING)를 대체한 신규 기능. 제출 로직이 아예 없던
              미완성 스텁이라 화면/라우트/intent 매핑을 통째로 지우고 이 자리를
              대신한다(git 히스토리에 그대로 남아있어 필요하면 복원 가능). */}
          <Route path="/nearby-place" element={<NearbyPlaceScreen />} />
          <Route path="/kiosk" element={<KioskLiveScreen />} />
          <Route path="/youtube" element={<YoutubePlayerScreen />} />
          <Route path="/auth/callback" element={<AuthCallbackScreen />} />
          {/* TODO: 이용 한도 상세 화면 — 아직 기획/디자인 없음, 라우팅 스텁만 연결 */}
          <Route path="/usage-limit" element={<UsageLimitScreen />} />
          {/* 홈 화면 헤더 설정 아이콘 진입 화면군 (HomeScreen.jsx SettingsIcon 참고).
              "알림 설정"은 더 이상 별도 화면이 아니라 /settings 안 "음성 및 알림"
              섹션으로 통합됐다(SettingsScreen.jsx 참고) — 그래서 옛
              /notification-settings 라우트는 삭제했다. */}
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/settings/allowed-apps" element={<AllowedAppsEditScreen />} />
          {/* TODO: 실제 보호자 모니터링 화면 확정 전까지 라우팅 스텁 */}
          <Route path="/settings/guardian-monitoring" element={<GuardianMonitoringScreen />} />
          <Route path="/subscription" element={<SubscriptionScreen />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
