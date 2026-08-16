// TODO(feature/fe-youtube-player): 기획서 4-6장 YoutubePlayerScreen 구현 예정.
/** Design reminder — phone-sized feature status screen; the route remains unchanged. */
import { useNavigate } from 'react-router-dom'
import { MobileFeaturePlaceholder } from '../components/common/MobileFeaturePlaceholder'

export function YoutubePlayerScreen() {
  const navigate = useNavigate()
  return <MobileFeaturePlaceholder title="영상 재생" eyebrow="보고 싶은 영상" description="말로 찾은 영상을 큰 글씨와 쉬운 조작으로 재생하는 기능을 준비하고 있어요." tip="영상 선택과 재생·정지를 더 쉽고 명확하게 도와드릴 예정이에요." onBack={() => navigate('/home')} icon={<PlayGlyph />} />
}

function PlayGlyph() {
  return <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none" /></svg>
}
