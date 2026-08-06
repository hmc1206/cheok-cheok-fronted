import { useEffect, useRef } from 'react'
import { useNaverMapLoader } from '../../hooks/useNaverMapLoader'

/**
 * 순수 렌더링 컴포넌트: origin/destination/routePath만 받아 지도 + 마커 + 경로선을 그린다.
 * API 호출이나 대화 상태 관리는 이 컴포넌트 밖(MapRouteScreen)에서 담당한다.
 *
 * @param {{lat:number, lng:number}} origin - 출발지 좌표 (필수)
 * @param {{lat:number, lng:number}|null} destination - 도착지 좌표
 * @param {{lat:number, lng:number}[]|null} routePath - 경로선을 그릴 좌표 배열
 * @param {(error: Error) => void} [onError] - SDK 로드 실패 시 부모에게 알림 (TTS 안내 등은 부모 책임)
 */
export function NaverMap({ origin, destination, routePath, onError }) {
  const { isLoaded, error } = useNaverMapLoader()
  const containerRef = useRef(null)

  useEffect(() => {
    if (error) onError?.(error)
  }, [error, onError])

  useEffect(() => {
    if (!isLoaded || !containerRef.current || !origin) return

    const { naver } = window
    const map = new naver.maps.Map(containerRef.current, {
      center: new naver.maps.LatLng(origin.lat, origin.lng),
      zoom: 14,
    })

    const originLatLng = new naver.maps.LatLng(origin.lat, origin.lng)
    const bounds = new naver.maps.LatLngBounds(originLatLng, originLatLng)

    new naver.maps.Marker({ position: originLatLng, map, title: '출발지' })

    if (destination) {
      const destinationLatLng = new naver.maps.LatLng(destination.lat, destination.lng)
      new naver.maps.Marker({ position: destinationLatLng, map, title: '도착지' })
      bounds.extend(destinationLatLng)
    }

    if (Array.isArray(routePath) && routePath.length > 0) {
      const path = routePath.map((point) => new naver.maps.LatLng(point.lat, point.lng))
      // ASSUMPTION: strokeColor는 디자이너 파일 적용 전 임시값. 토큰화는 나중에.
      new naver.maps.Polyline({ map, path, strokeColor: '#2f6fed', strokeWeight: 5 })
      path.forEach((latLng) => bounds.extend(latLng))
    }

    // fitBounds: 출발/도착/경로 전체가 거리와 무관하게 한 화면에 들어오도록 자동 확대/축소한다.
    // 노인 사용자가 손가락으로 지도를 줌/팬 조작하지 않아도 경로 전체가 바로 보이게 하기 위함.
    map.fitBounds(bounds)
  }, [isLoaded, origin, destination, routePath])

  if (error) {
    // ASSUMPTION: 최소한의 텍스트 폴백만 표시. 음성(TTS) 안내는 onError를 받은 부모가 처리한다.
    return <p>지도를 불러오지 못했습니다.</p>
  }

  return <div ref={containerRef} className="w-full" style={{ height: '320px' }} />
}
