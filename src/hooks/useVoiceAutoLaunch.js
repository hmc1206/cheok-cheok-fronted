import { useEffect, useRef } from 'react'
import { openDeepLinkWithWebFallback } from '../lib/deepLink'

// 길찾기(MapRouteScreen)에서 처음 만든 "음성 응답이 step: DONE으로 도착하면 서버가
// 이미 만들어준 딥링크(appUrl/webUrl)를 자동으로 연다" 패턴을 내 주변 병원·약국
// 찾기(NearbyPlaceScreen)와 공유하기 위해 뺐다(요청사항: "공통으로 쓸 수 있는
// 컴포넌트/함수는... 이번 기회에 공통화") — 두 화면 다 "이 화면이 기다리던
// intent이고 DONE이면 서버가 만든 링크로 자동 실행"이라는 동일한 규칙을 따른다.
//
// isActive: 지금 이 화면이 기다리던 응답인지(예: intent === 'MAP_ROUTE' && step
// === 'DONE'). appUrl/webUrl이 있어도 isActive가 아니면(다른 화면에서 쓰다 남은
// 값 등) 실행하지 않는다.
// onLaunch: 딥링크를 열기 직전에 호출된다(예: 화면을 실행 단계로 전환). 매 렌더마다
// 새 함수가 들어와도(useCallback 없이 인라인 함수를 넘겨도) 재실행을 유발하지
// 않도록 ref로만 참조한다 — 실제 재실행 여부는 아래 launchedAppUrlRef가 결정한다.
export function useVoiceAutoLaunch({ isActive, appUrl, webUrl, onLaunch }) {
  // 같은 DONE 응답으로 두 번 실행되지 않게(리렌더 등) 마지막에 실행한 appUrl을
  // 기억해둔다.
  const launchedAppUrlRef = useRef(null)
  const onLaunchRef = useRef(onLaunch)
  onLaunchRef.current = onLaunch

  useEffect(() => {
    if (!isActive || !appUrl || launchedAppUrlRef.current === appUrl) return
    launchedAppUrlRef.current = appUrl
    onLaunchRef.current?.()
    openDeepLinkWithWebFallback(appUrl, webUrl)
  }, [isActive, appUrl, webUrl])
}
