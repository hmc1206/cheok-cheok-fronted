import { GoogleOAuthProvider } from '@react-oauth/google'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './components/common/ThemeProvider'
import { HomeScreen } from './screens/HomeScreen'
import { KioskLiveScreen } from './screens/KioskLiveScreen'
import { LoginPage } from './screens/LoginPage'
import { MapRouteScreen } from './screens/MapRouteScreen'
import { TrainBookingScreen } from './screens/TrainBookingScreen'
import { YoutubePlayerScreen } from './screens/YoutubePlayerScreen'

// 기획서 2장 라우트 표를 그대로 반영한 라우터 뼈대.
// 구글 로그인은 서버사이드 리다이렉트(/auth/callback) 방식에서 클라이언트 팝업
// (@react-oauth/google) 방식으로 확정되어 GoogleOAuthProvider로 앱 전체를 감싼다.
function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/map" element={<MapRouteScreen />} />
            <Route path="/train" element={<TrainBookingScreen />} />
            <Route path="/kiosk" element={<KioskLiveScreen />} />
            <Route path="/youtube" element={<YoutubePlayerScreen />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </GoogleOAuthProvider>
  )
}

export default App
