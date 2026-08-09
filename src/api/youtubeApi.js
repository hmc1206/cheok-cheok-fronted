import apiClient from './apiClient'

export const youtubeApi = {
  control: ({ userId, action }) =>
    apiClient.post('/youtube/control', { userId, action }).then((res) => res.data),
}
