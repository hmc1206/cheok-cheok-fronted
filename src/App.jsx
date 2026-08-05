import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './components/common/ThemeProvider'
import { HomeScreen } from './screens/HomeScreen'
import { KioskLiveScreen } from './screens/KioskLiveScreen'
import { LoginPage } from './screens/LoginPage'
import { MapRouteScreen } from './screens/MapRouteScreen'
import { TrainBookingScreen } from './screens/TrainBookingScreen'
import { YoutubePlayerScreen } from './screens/YoutubePlayerScreen'
import AuthCallbackScreen from './screens/AuthCallbackScreen' // 💡 방금 만든 콜백 스크린 import 추가!

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
          
          {/* 💡 백엔드가 토큰을 실어 보내준 주소를 처리하는 라우트를 추가합니다. */}
          <Route path="/auth/callback" element={<AuthCallbackScreen />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
