import { useCallback, useState } from 'react'

// MapRouteScreen에서 진입 시 현재 위치를 자동 획득해 ASK_ORIGIN 질문을 건너뛰는 데 쓴다.
export function useGeolocation() {
  const [coords, setCoords] = useState(null)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('idle') // idle | loading | granted | denied

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('denied')
      setError(new Error('이 브라우저는 위치 정보를 지원하지 않습니다.'))
      return
    }

    setStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude })
        setStatus('granted')
      },
      (geoError) => {
        setError(geoError)
        setStatus('denied')
      },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }, [])

  return { coords, error, status, requestLocation }
}
