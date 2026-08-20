import apiClient from './apiClient'

// "내 주변 병원·약국 찾기"의 버튼 클릭(음성 없이) 경로. 예전에는 백엔드 계약이 확정되지
// 않아 mock으로 `nmap://search?query=내 주변 병원`을 만들어 열었는데, 이 URL에는 좌표가
// 전혀 없어서 네이버 지도가 늘 기본 위치(서울)를 보여줬다 — 현재 위치와 상관없이 서울
// 병원이 나오던 원인 중 하나다. 백엔드 `POST /api/map/hospital`(BACKEND_REQUIREMENTS.md
// 14장)이 좌표를 받아 현재 위치 기준으로 가장 가까운 곳을 골라주므로 그대로 호출한다.
//
// 응답은 음성 경로(/voice/process)와 동일한 봉투
// { intent, step, ttsText, screen, data: { naverMapAppUrl, naverMapWebUrl } }라서
// 호출부(NearbyPlaceScreen.jsx)가 쓰는 data만 풀어서 돌려준다 — routesApi와 같은 방식.
const CATEGORY_TYPE = {
  hospital: 'HOSPITAL',
  pharmacy: 'PHARMACY',
}

export const nearbyPlaceApi = {
  getNearbyPlaceLink: ({ latitude, longitude, category }) =>
    apiClient
      .post('/api/map/hospital', {
        type: CATEGORY_TYPE[category] ?? 'HOSPITAL',
        latitude,
        longitude,
      })
      .then((res) => res.data.data),
}
