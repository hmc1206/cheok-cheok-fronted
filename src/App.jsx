import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './components/common/ThemeProvider'
import { AuthCallbackScreen } from './screens/AuthCallbackScreen'
import { HomeScreen } from './screens/HomeScreen'
import { KioskCaptureScreen } from './screens/KioskCaptureScreen'
import { KioskLiveScreen } from './screens/KioskLiveScreen'
import { LoginPage } from './screens/LoginPage'
import { MapRouteScreen } from './screens/MapRouteScreen'
import { TrainBookingScreen } from './screens/TrainBookingScreen'
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
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/home" element={<HomeScreen />} />
          <Route path="/map" element={<MapRouteScreen />} />
          <Route path="/train" element={<TrainBookingScreen />} />
          {/* 메가커피 전용 "촬영 기반" 새 키오스크 안내 화면(이번 작업 범위).
              기존 실시간 연속 인식 화면(맘스터치 포함)은 /kiosk-legacy에 그대로 남겨,
              맘스터치 코드/기능을 건드리지 않으면서도 계속 테스트할 수 있게 했다. */}
          <Route path="/kiosk" element={<KioskCaptureScreen />} />
          <Route path="/kiosk-legacy" element={<KioskLiveScreen />} />
          <Route path="/youtube" element={<YoutubePlayerScreen />} />
          <Route path="/auth/callback" element={<AuthCallbackScreen />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
