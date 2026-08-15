import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { MicPermissionGate } from './components/common/MicPermissionGate'
import { ThemeProvider } from './components/common/ThemeProvider'
import { AllowedAppsEditScreen } from './screens/AllowedAppsEditScreen'
import { AuthCallbackScreen } from './screens/AuthCallbackScreen'
import { ChatScreen } from './screens/ChatScreen'
import { GuardianMonitoringScreen } from './screens/GuardianMonitoringScreen'
import { HomeScreen } from './screens/HomeScreen'
import { KioskLiveScreen } from './screens/KioskLiveScreen'
import { LoginPage } from './screens/LoginPage'
import { MapRouteScreen } from './screens/MapRouteScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { SubscriptionScreen } from './screens/SubscriptionScreen'
import { TrainBookingScreen } from './screens/TrainBookingScreen'
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
function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        {/* 앱 최상단 마운트 지점 — 라우트가 바뀌어도 다시 만들어지지 않도록 Routes
            바깥에 딱 한 번만 둔다. 마이크 권한 상태는 전역(Zustand)이라 여기 위치는
            "앱 로드 시 한 번 확인"이라는 타이밍 요구사항 때문일 뿐, 화면별로 따로
            둘 필요는 없다. */}
        <MicPermissionGate />
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/home" element={<HomeScreen />} />
          {/* 홈 화면 "눌러서 말하기" 카드에서 진입하는 음성 채팅 페이지 */}
          <Route path="/chat" element={<ChatScreen />} />
          <Route path="/map" element={<MapRouteScreen />} />
          <Route path="/train" element={<TrainBookingScreen />} />
          <Route path="/kiosk" element={<KioskLiveScreen />} />
          <Route path="/youtube" element={<YoutubePlayerScreen />} />
          <Route path="/auth/callback" element={<AuthCallbackScreen />} />
          {/* TODO: 이용 한도 상세 화면 — 아직 기획/디자인 없음, 라우팅 스텁만 연결 */}
          <Route path="/usage-limit" element={<UsageLimitScreen />} />
          {/* 햄버거 메뉴 "설정"/"월 구독 신청" 진입 화면군 (SidePanel.jsx 참고).
              "알림 설정"은 더 이상 별도 화면이 아니라 /settings 안 "음성 및 알림"
              섹션으로 통합됐다(SettingsScreen.jsx 참고) — 그래서 옛
              /notification-settings 라우트는 삭제했다. */}
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/settings/allowed-apps" element={<AllowedAppsEditScreen />} />
          {/* TODO: 실제 보호자 모니터링 화면 확정 전까지 라우팅 스텁.
              개인정보 처리방침(/settings/privacy-policy)은 "앱 정보" 섹션 자체가
              삭제되며 연결할 곳이 없어져 라우트/화면 파일을 함께 삭제했다. */}
          <Route path="/settings/guardian-monitoring" element={<GuardianMonitoringScreen />} />
          <Route path="/subscription" element={<SubscriptionScreen />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
