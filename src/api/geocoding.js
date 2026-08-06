// TODO(백엔드/키 확인 필요): 네이버 Geocoding API 실제 엔드포인트·인증 방식이 아직 안 정해져
// 스텁만 만들어둔다. 네이버 클라우드 플랫폼(X-NCP-APIGW-API-KEY-ID/KEY)과 네이버 오픈API
// (X-Naver-Client-Id/Secret) 중 어느 쪽인지, 그리고 브라우저에서 직접 호출할지 백엔드가
// 프록시할지도 미정이다. 확정되면 이 함수 내부 구현만 교체하면 되도록 시그니처만 먼저 고정한다.
export async function geocodeAddress(query) {
  throw new Error(`geocodeAddress(${query})는 아직 구현되지 않았습니다 (Geocoding API 스펙 확인 필요).`)
}
