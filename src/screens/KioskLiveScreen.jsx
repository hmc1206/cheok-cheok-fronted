// TODO(feature/fe-kiosk-live): 기획서 4-4장 KioskLiveScreen(실전 키오스크 도움) 구현 예정.
/** Design reminder — phone-sized feature status screen; the route remains unchanged. */
import { useNavigate } from 'react-router-dom'
import { MobileFeaturePlaceholder } from '../components/common/MobileFeaturePlaceholder'

export function KioskLiveScreen() {
  const navigate = useNavigate()
  return <MobileFeaturePlaceholder title="키오스크 도움" eyebrow="화면을 함께 읽어드려요" description="카메라로 키오스크 화면을 비추면 다음에 눌러야 할 곳을 안내하는 기능을 준비하고 있어요." tip="주문·결제 화면에서 헷갈릴 때 쉽게 도움을 받을 수 있게 만들고 있어요." onBack={() => navigate('/home')} icon={<KioskGlyph />} />
}

function KioskGlyph() {
  return <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="2" width="14" height="19" rx="2" /><rect x="8.5" y="5" width="7" height="6" rx="1" /><path d="M9 16h6" /></svg>
}
