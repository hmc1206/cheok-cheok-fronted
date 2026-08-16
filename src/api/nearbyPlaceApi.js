// TODO(backend): "내 주변 병원·약국 찾기" 기능은 API 명세서에 intent/엔드포인트가
// 전혀 정의돼 있지 않다(코드베이스 전체 확인 완료 — MAP_ROUTE/TRAIN_BOOKING 문서
// 어디에도 주변 카테고리 검색 관련 내용이 없음). 아래 4가지가 백엔드와 확인이
// 필요하다(사용자에게 보고 완료):
//   1) 음성 발화("약국 찾아줘")를 처리할 intent 이름 — 우선 NEARBY_PLACE로 가정
//      해뒀다(useVoiceAssistant.js의 INTENT_ROUTES 참고).
//   2) "가장 가까운 1곳"을 특정해서 응답하는지, 여러 후보 리스트로 응답하는지.
//   3) 네이버 지도 "주변 카테고리 검색" 딥링크/웹 URL이 MAP_ROUTE의
//      naverMapAppUrl/naverMapWebUrl과 같은 패턴인지, 별도 스킴이 필요한지.
//   4) 버튼 클릭(음성 없이) 경로의 실제 요청 엔드포인트/파라미터 형식.
//
// 위 사항이 확정되기 전까지는 실제 네트워크 요청을 보내지 않고, 화면 흐름(GPS
// 획득 -> "실행하는 중" -> 딥링크 시도)만 검증할 수 있도록 로컬에서 지연 후 가짜
// 응답을 만들어 돌려준다(사용자 확인 — "mock으로 UI/흐름만 먼저 구현"). 실제
// 엔드포인트가 정해지면 이 함수 내부만 apiClient.post(...) 호출로 바꾸면 되고,
// 호출부(NearbyPlaceScreen.jsx)는 { naverMapAppUrl, naverMapWebUrl } 형태만
// 그대로 받으므로 손댈 필요가 없다.
const CATEGORY_LABEL = {
  hospital: '병원',
  pharmacy: '약국',
}

export const nearbyPlaceApi = {
  getNearbyPlaceLink: ({ latitude: _latitude, longitude: _longitude, category }) =>
    new Promise((resolve) => {
      const label = CATEGORY_LABEL[category] ?? category
      // 실제 좌표(latitude/longitude — lib/geolocation.js, 날씨 API 요청 필드명과
      // 통일)는 진짜 백엔드가 생기면 요청 바디에 실려야 하지만, mock에는 검색
      // 결과에 영향을 줄 서버가 없어 URL에 반영하지 않는다 — 그래도 인자로는
      // 받아둬서(위) 실제 연동 시 호출부를 안 바꿔도 되게 한다.
      setTimeout(() => {
        resolve({
          naverMapAppUrl: `nmap://search?query=${encodeURIComponent(`내 주변 ${label}`)}&appname=com.chuckchuck.app`,
          naverMapWebUrl: `https://map.naver.com/p/search/${encodeURIComponent(`내 주변 ${label}`)}`,
        })
      }, 600)
    }),
}
