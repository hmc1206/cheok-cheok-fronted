import apiClient from './apiClient'

// API 명세서 v2.0 8-1장: /voice/process 응답(data.app_url/web_url)이 보통은 이미 완성된
// 딥링크를 주므로, 이 엔드포인트는 QA/디버깅용 단독 재생성 호출로만 쓴다.
// keyword 없이 호출하면 유튜브 홈 링크를 돌려준다.
export const youtubeApi = {
  getLink: (keyword) =>
    apiClient
      .get('/api/v1/youtube/link', { params: keyword ? { keyword } : {} })
      .then((res) => res.data.data),
}
