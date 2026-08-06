import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './components/common/ThemeProvider'
import { AuthCallbackScreen } from './screens/AuthCallbackScreen'
import { HomeScreen } from './screens/HomeScreen'
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
function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/map" element={<MapRouteScreen />} />
          <Route path="/train" element={<TrainBookingScreen />} />
          <Route path="/kiosk" element={<KioskLiveScreen />} />
          <Route path="/youtube" element={<YoutubePlayerScreen />} />
          <Route path="/auth/callback" element={<AuthCallbackScreen />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
