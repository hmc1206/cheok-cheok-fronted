import { useCallback, useState } from 'react'
import { getCurrentPosition } from '../lib/geolocation'

// 내 주변 병원·약국 찾기(NearbyPlaceScreen)처럼 GPS 확보 과정 자체를 화면
// 단계(입력 -> 위치 확인 중 -> 실행)로 보여줘야 하는 "리액티브" 화면을 위한
// 버전 — 실제 navigator.geolocation 호출은 lib/geolocation.js의
// getCurrentPosition 하나로 통일했고(요청사항: 세 기능이 각자 구현하던 걸
// 공통 유틸 하나로), 이 훅은 그 결과를 status(idle/loading/granted/denied)로
// 감싸 리렌더를 트리거하는 역할만 한다. 반대로 화면 전환 없이 딱 한 번만
// 좌표가 필요한 곳(오늘의 날씨 버튼 등)은 이 훅 대신 getCurrentPositionOrNull을
// 직접 쓴다 — 훅은 컴포넌트 렌더 사이클에 묶여 있어 이벤트 핸들러 안에서
// "그때그때 딱 한 번" 쓰기엔 오히려 번거롭다.
export function useGeolocation() {
  const [coords, setCoords] = useState(null)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('idle') // idle | loading | granted | denied

  const requestLocation = useCallback((options) => {
    setStatus('loading')
    setError(null)
    getCurrentPosition(options)
      .then((position) => {
        setCoords(position)
        setStatus('granted')
      })
      .catch((geoError) => {
        setError(geoError)
        setStatus('denied')
      })
  }, [])

  return { coords, error, status, requestLocation }
}
