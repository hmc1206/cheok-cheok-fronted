import apiClient from './apiClient'

// POST /api/v1/routes/naver-link: 출발지/목적지 이름만 보내면 백엔드가 좌표 변환(네이버/
// 카카오 주소 검색) + 네이버 지도 대중교통 딥링크 조립까지 전부 처리해서 돌려준다.
// 응답이 다른 API들과 달리 { statusCode, message, data: {...} } 형태로 한 번 더
// data로 감싸져 있어, 실제로 필요한 naverMapAppUrl/naverMapWebUrl까지 여기서 풀어준다.
export const routesApi = {
  getNaverMapLink: ({ startName, goalName }) =>
    apiClient.post('/v1/routes/naver-link', { startName, goalName }).then((res) => res.data.data),
}
