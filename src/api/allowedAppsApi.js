// TODO(백엔드 확인 필요): API 명세서 v2.0(통합본)에는 "허용 앱·사이트 관리"(연결
// 허용된 외부 앱 목록/토글) 관련 엔드포인트가 전혀 없다. 명세서 10-3장에 iOS/Android
// 딥링크 화이트리스트(LSApplicationQueriesSchemes, AndroidManifest <queries>)는
// 나오지만 그건 네이티브 앱 설정 파일이지 백엔드 API가 아니다. 실제로 어떤 앱을
// 화이트리스트에 넣을지/사용자별로 켜고 끌 수 있는지는 백엔드와 확인이 필요해서,
// 지금은 화면에 필요한 5개 앱(유튜브/네이버지도/전화/문자/카카오톡)을 전부
// "연결됨" 상태로 고정한 mock 목록만 반환한다. 백엔드 엔드포인트가 정해지면
// 이 파일 내부 구현만 실제 GET/PATCH 호출로 교체하면 되도록 반환 형태(id, name,
// description, connected)만 먼저 잡아둔다.
//
// "카카오맵" 항목 삭제(요청사항): 이 파일 전체가 실제 백엔드 연동 없이 로컬
// 배열만으로 동작하는 mock이고(위 TODO 참고), "카카오맵"을 참조하는 다른
// 화면/로직(길찾기·병원약국찾기 등)도 저장소 전체에서 확인한 결과 없었다 —
// 이 배열의 항목 하나였을 뿐이라 UI 목록에서 빼는 것이 곧 로직 삭제 전부다.
let mockApps = [
  { id: 'youtube', name: '유튜브', description: '동영상 재생 허용됨', connected: true },
  { id: 'naverMap', name: '네이버 지도', description: '길찾기 연동 허용됨', connected: true },
  { id: 'phone', name: '전화', description: '전화 걸기 허용됨', connected: true },
  { id: 'sms', name: '문자(SMS)', description: '문자 보내기 허용됨', connected: true },
  { id: 'kakaoTalk', name: '카카오톡', description: '메시지 보내기 허용됨', connected: true },
]

export const allowedAppsApi = {
  getAllowedApps: async () => {
    // MOCK: 실제 API 연동 전까지 메모리에만 저장된 값을 돌려준다.
    return mockApps.map((app) => ({ ...app }))
  },
  updateAllowedApp: async (id, connected) => {
    // MOCK: 저장 API가 없어 로컬 배열에만 반영한다.
    mockApps = mockApps.map((app) => (app.id === id ? { ...app, connected } : app))
    return mockApps.map((app) => ({ ...app }))
  },
}
