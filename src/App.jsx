import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './components/common/ThemeProvider'
import { AuthCallbackScreen } from './screens/AuthCallbackScreen'
import { HomeScreen } from './screens/HomeScreen'
import { KioskLiveScreen } from './screens/KioskLiveScreen'
import { MapRouteScreen } from './screens/MapRouteScreen'
import { TrainBookingScreen } from './screens/TrainBookingScreen'
import { YoutubePlayerScreen } from './screens/YoutubePlayerScreen'

// 기획서 2장 라우트 표를 그대로 반영한 라우터 뼈대.
function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
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
