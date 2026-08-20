// TODO(백엔드 확인 필요): API 명세서 v2.0(통합본)에 구독/결제 관련 엔드포인트가
// 전혀 없다. 이건 실제 결제(카드 등록, 정기 결제)가 걸린 기능이라 usageApi.js/
// notificationApi.js 같은 단순 mock보다 더 신중해야 한다 — 그래서 이 함수는 실제로
// 아무 결제도 일으키지 않고, 그냥 "신청됐다"는 응답만 흉내 낸다. 실제 결제 연동은
// 반드시 백엔드 API(PG사 연동 방식 포함)가 확정된 뒤에 이 함수 내부만 교체해서
// 진행해야 한다 — 지금 이 구현을 실제 결제로 오해해서는 안 된다.
export const subscriptionApi = {
  subscribe: async () => {
    // MOCK: 실제 결제/구독 처리 없음. 화면 확인용 가짜 성공 응답만 반환한다.
    return { success: true }
  },
}
