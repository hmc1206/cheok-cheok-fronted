// TODO(백엔드 확인 필요): API 명세서 v2.0(통합본)에 알림 설정 조회/저장 엔드포인트나
// 알림 카테고리 목록이 정의돼 있지 않다. 그래서 "카테고리별 on/off 토글"은 이번
// 구현에서 만들지 않고(명세서에 카테고리 자체가 없음), "전체 알림 on/off" 하나만
// 요구사항의 최소 조건대로 구현한다. 아래 함수들은 백엔드 확정 전까지 로컬 상태를
// 그대로 돌려주는 mock이다 — 실제 엔드포인트가 정해지면 내부 구현만 교체하면 된다.
let mockEnabled = true // 모듈 스코프 변수로 mock 상태를 유지해, 화면을 나갔다 들어와도 값이 남아있게 한다.

export const notificationApi = {
  getSettings: async () => {
    // MOCK: 실제 API 연동 전까지 메모리에만 저장된 값을 돌려준다.
    return { enabled: mockEnabled }
  },
  updateSettings: async ({ enabled }) => {
    // MOCK: 저장 API가 없어 로컬 변수에만 반영한다.
    mockEnabled = enabled
    return { enabled: mockEnabled }
  },
}
