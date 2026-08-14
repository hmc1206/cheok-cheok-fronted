// TODO(백엔드 확인 필요): API 명세서 v2.0(통합본)을 확인했으나, "이번 달 무료 이용
// 횟수"/이용 한도 관련 엔드포인트나 응답 필드가 어디에도 정의돼 있지 않다
// (voice/process, 유튜브/지도 링크 생성, 인증 관련 API만 정의됨). 임의로 엔드포인트를
// 만들어내지 않고, 백엔드와 실제 스펙이 확정될 때까지 아래 함수는 고정값을 돌려주는
// mock으로만 동작한다 — 나중에 실제 엔드포인트가 정해지면 이 함수 내부 구현만
// 교체하면 되도록 시그니처(반환 형태 { remainingFreeUsage })만 먼저 잡아둔다.
export const usageApi = {
  getUsageStatus: async () => {
    // MOCK: 실제 API 연동 전까지 임시 고정값.
    return { remainingFreeUsage: 3 }
  },
}
