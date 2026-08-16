// hooks/useGeolocation.js는 여러 렌더에 걸쳐 status(idle/loading/granted/denied)를
// 지켜보며 화면을 단계별로 전환해야 하는 화면(내 주변 병원·약국 찾기)을 위한
// "리액티브" 버전이다. 반면 "오늘의 날씨" 버튼은 화면 전환 없이 딱 한 번만
// 좌표를 얻어보고, 실패해도(권한 거부/타임아웃/미지원 등) 좌표 없이 그대로
// 진행하면 되는 "일회성" 용도라 훅이 아니어도 된다 — Promise 하나로 충분하고,
// 실패를 reject 대신 null로 resolve해서 호출부가 항상 이어서 진행할 수 있게
// 한다(날씨 API 명세서 5장: 좌표가 없으면 서버가 ASK_LOCATION으로 되물을 뿐,
// 프론트가 에러 처리할 필요가 없는 정상 흐름이다).
export function getCurrentPositionOnce({ timeout = 5000 } = {}) {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout },
    )
  })
}
