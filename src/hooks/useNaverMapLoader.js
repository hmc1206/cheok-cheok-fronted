import { useEffect, useState } from 'react'

const NAVER_MAPS_SRC = 'https://oapi.map.naver.com/openapi/v3/maps.js'

// 모듈 스코프(컴포넌트 바깥)에 로딩 Promise를 캐싱해둔다. 이 훅을 여러 화면/컴포넌트가
// 동시에 사용해도 <script> 태그가 한 번만 삽입되고 SDK 로드도 한 번만 일어나게 하기 위함이다.
// (매번 새 <script>를 추가하면 "naver가 이미 정의됨" 같은 충돌이나 중복 네트워크 요청이 생긴다.)
let loaderPromise = null

function loadNaverMapsScript(clientId) {
  if (loaderPromise) return loaderPromise

  loaderPromise = new Promise((resolve, reject) => {
    // HMR로 훅이 재실행되거나 다른 경로로 이미 로드된 경우, 재요청 없이 바로 resolve.
    if (window.naver?.maps) {
      resolve(window.naver.maps)
      return
    }

    const script = document.createElement('script')
    script.src = `${NAVER_MAPS_SRC}?ncpClientId=${clientId}&submodules=geocoder`
    script.async = true
    script.onload = () => {
      if (window.naver?.maps) {
        resolve(window.naver.maps)
      } else {
        reject(new Error('네이버 지도 SDK 로드 후에도 window.naver.maps를 찾을 수 없습니다.'))
      }
    }
    script.onerror = () => {
      loaderPromise = null // 실패 시 재시도할 수 있게 캐시를 비워둔다.
      reject(new Error('네이버 지도 SDK 스크립트 로드에 실패했습니다.'))
    }
    document.head.appendChild(script)
  })

  return loaderPromise
}

// 네이버 지도 SDK(v3)를 동적으로 로드하고, window.naver.maps가 실제로 준비될 때까지의
// 상태(isLoaded/error)를 제공한다. NaverMap 컴포넌트는 이 훅이 isLoaded === true가 될
// 때까지 naver.maps.Map 등을 생성하면 안 된다 (SDK 로드 전엔 해당 클래스들이 없다).
export function useNaverMapLoader() {
  const [isLoaded, setIsLoaded] = useState(Boolean(window.naver?.maps))
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isLoaded) return

    const clientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID
    if (!clientId) {
      setError(new Error('VITE_NAVER_MAP_CLIENT_ID가 설정되지 않았습니다.'))
      return
    }

    let cancelled = false
    loadNaverMapsScript(clientId)
      .then(() => {
        if (!cancelled) setIsLoaded(true)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })

    return () => {
      cancelled = true
    }
  }, [isLoaded])

  return { isLoaded, error }
}
