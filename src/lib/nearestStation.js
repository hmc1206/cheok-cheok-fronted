const EARTH_RADIUS_KM = 6371

function toRadians(degrees) {
  return (degrees * Math.PI) / 180
}

// Haversine 공식: 위경도 두 점 사이의 대권거리(구면 위 최단거리)를 km 단위로 구한다.
// 실제 도로/철로 거리와는 다르지만(직선거리 근사), "가장 가까운 역"을 고르는 용도로는
// 이걸로 충분하다 — 정밀한 실제 이동 경로/거리는 이후 네이버 지도 쪽이 계산해준다.
function haversineDistanceKm(a, b) {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)

  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

/**
 * coord와 가장 가까운 역을 stations 배열에서 찾는다.
 * @param {{lat:number, lng:number}} coord
 * @param {{name:string, lat:number, lng:number}[]} stations
 * @returns {{name:string, lat:number, lng:number, distanceKm:number}|null}
 *   stations가 비어있으면(현재 trainStations.json이 placeholder라서) null을 반환해
 *   호출부가 "역 데이터 없음" 상태로 안전하게 처리할 수 있게 한다.
 */
export function findNearestStation(coord, stations) {
  if (!coord || !Array.isArray(stations) || stations.length === 0) return null

  let nearest = null
  let nearestDistanceKm = Infinity

  for (const station of stations) {
    const distanceKm = haversineDistanceKm(coord, { lat: station.lat, lng: station.lng })
    if (distanceKm < nearestDistanceKm) {
      nearestDistanceKm = distanceKm
      nearest = station
    }
  }

  return nearest ? { ...nearest, distanceKm: nearestDistanceKm } : null
}
