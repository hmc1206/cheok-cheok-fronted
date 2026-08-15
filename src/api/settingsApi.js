// TODO(백엔드 확인 필요): API 명세서 v2.0(통합본)에 "설정" 화면의 음성 안내/민감
// 행동 확인 알림/광고 시청 알림 조회·저장 엔드포인트가 정의돼 있지 않다(voice/process,
// 유튜브·지도 링크 생성, 인증 관련 API만 정의됨). notificationApi.js(전체 알림
// on/off, SettingsScreen.jsx의 "음성 및 알림" 섹션 네 번째 토글)와는 별개의 mock
// 저장소를 쓰는 토글 3개라 여기서 새로 mock을 만든다 — 백엔드 확정 전까지 모듈
// 스코프 변수로만 상태를 유지하고, 실제 엔드포인트가 정해지면 이 파일 내부 구현만
// 교체하면 되도록 반환 형태 { voiceGuidance, sensitiveActionAlert, adViewAlert }
// 만 먼저 잡아둔다.
let mockSettings = {
  voiceGuidance: true, // 음성 안내
  sensitiveActionAlert: true, // 민감 행동(결제/외부 앱 연결 등) 확인 알림
  adViewAlert: true, // 광고 시청 알림
}

export const settingsApi = {
  getSettings: async () => {
    // MOCK: 실제 API 연동 전까지 메모리에만 저장된 값을 돌려준다.
    return { ...mockSettings }
  },
  updateSetting: async (key, value) => {
    // MOCK: 저장 API가 없어 로컬 변수에만 반영한다.
    mockSettings = { ...mockSettings, [key]: value }
    return { ...mockSettings }
  },
}
