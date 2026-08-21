// 길찾기(출발지 "현재 위치")/내 주변 병원·약국 찾기/오늘의 날씨 세 기능이 전부
// "현재 위치 좌표를 하나 얻어온다"는 같은 일을 각자 따로 구현하고 있었다
// (hooks/useGeolocation.js와 이 파일이 서로 다른 타임아웃·에러 처리로 중복 구현
// 돼 있었음) — 그래서 실제 navigator.geolocation 호출은 이 파일의 getCurrentPosition
// 하나로만 하고, 리액티브 화면 전환이 필요한 곳(hooks/useGeolocation.js)과
// 일회성 호출만 필요한 곳(오늘의 날씨 버튼 등)이 이 함수 위에서 각자 필요한
// 형태로만 감싸 쓰게 했다. "위치 획득"만 담당하고 실패 시 어떤 화면으로
// 보낼지는 호출부 책임으로 남겨둔다(요청사항 2번 — 기능마다 실패 처리 방식이
// 달라서: 날씨는 지역 직접 입력 화면, 길찾기는 수동 입력, 병원·약국은 카테고리
// 선택 화면으로 각자 다르게 되돌아간다).

// 브라우저 GeolocationPositionError.code(1/2/3)는 숫자라 호출부에서 매번
// error.PERMISSION_DENIED 같은 정적 상수와 비교해야 해서 가독성이 떨어진다 —
// 문자열 코드로 정규화해서 어디서든 같은 이름으로 분기할 수 있게 한다
// (요청사항 3번: 공통 에러 코드 체계).
export const GEOLOCATION_ERROR = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  POSITION_UNAVAILABLE: 'POSITION_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',
  NOT_SUPPORTED: 'NOT_SUPPORTED',
}

// 사용자 확인(2026-08): 세 기능 모두 옵션값을 동일하게 통일한다.
//  - enableHighAccuracy: true — GPS 칩을 우선 써서 더 정확한 좌표를 얻는다
//    (조금 느려질 수 있지만, 셋 다 "정확한 현재 위치"가 중요한 기능이라 통일).
//  - timeout: 8000 — 기존 병원·약국 찾기(8000ms)에 맞춤. 날씨/길찾기가 예전에
//    쓰던 5000ms보다 여유를 둬서, 실내 등 GPS 신호가 약한 환경에서도 성급하게
//    실패 처리하지 않게 한다.
//  - maximumAge: 30000 — 30초 이내에 얻어둔 위치가 있으면 그걸 재사용해도
//    되는 정도로 "현재 위치"라고 볼 수 있다고 판단 — 매번 하드웨어를 새로
//    폴링하지 않아 응답이 빨라지고, 짧은 시간 안에 위치 권한 팝업이 반복
//    적으로 뜨는 것도 자연스럽게 줄어든다(요청사항 5번).
export const DEFAULT_GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 8000,
  maximumAge: 30000,
}

// GeolocationPositionError는 인스턴스 자체에 PERMISSION_DENIED 같은 상수를
// 들고 있다(error.PERMISSION_DENIED === error.code일 때 매치) — 그 관례를 그대로
// 따라 매칭하되, 브라우저마다 상수 프로퍼티가 없는 엣지 케이스에 대비해 코드
// 숫자(1/2/3) 하드코딩도 fallback으로 같이 둔다.
function normalizeGeolocationError(error) {
  const code = error?.code
  if (code === error?.PERMISSION_DENIED || code === 1) {
    return { code: GEOLOCATION_ERROR.PERMISSION_DENIED, message: '위치 접근 권한이 거부되었습니다.' }
  }
  if (code === error?.TIMEOUT || code === 3) {
    return { code: GEOLOCATION_ERROR.TIMEOUT, message: '위치를 확인하는 데 시간이 너무 오래 걸렸습니다.' }
  }
  // POSITION_UNAVAILABLE(2)과, code를 알 수 없는 그 외 모든 경우를 같은 카테고리로
  // 묶는다 — 호출부 입장에선 둘 다 "좌표를 못 구했다"는 점에서 동일하게 다뤄도
  // 충분하다.
  return { code: GEOLOCATION_ERROR.POSITION_UNAVAILABLE, message: '위치 정보를 확인할 수 없습니다.' }
}

/**
 * 현재 위치 좌표를 한 번 요청한다. navigator.geolocation.getCurrentPosition을
 * Promise로 감싼 것 — 세 기능이 공유하는 유일한 실제 GPS 호출 지점이다.
 *
 * 개인정보 유의사항(날씨 API 명세서 요구사항): 좌표(latitude/longitude)는
 * 어떤 경우에도 console.log 등으로 남기지 않는다 — 이 함수도, 이 함수를 쓰는
 * 화면들도 좌표를 로그로 찍지 않는다.
 *
 * @returns {Promise<{latitude:number, longitude:number}>} 성공 시 좌표.
 *   필드명을 latitude/longitude로 맞춘 이유 — 날씨 API가 요청 바디에 그대로
 *   싣는 필드명과 동일해서, 호출부에서 별도로 이름을 바꿀 필요가 없다.
 * @throws {{code:string, message:string}} 실패 시 GEOLOCATION_ERROR 중 하나로
 *   정규화된 에러. 화면마다 이 code를 보고 각자 다르게 반응한다(요청사항 2번).
 */
export function getCurrentPosition(options) {
  const { enableHighAccuracy, timeout, maximumAge } = { ...DEFAULT_GEOLOCATION_OPTIONS, ...options }
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject({ code: GEOLOCATION_ERROR.NOT_SUPPORTED, message: '이 브라우저는 위치 정보를 지원하지 않습니다.' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (error) => reject(normalizeGeolocationError(error)),
      { enableHighAccuracy, timeout, maximumAge },
    )
  })
}

/**
 * getCurrentPosition을 감싸서 절대 reject하지 않는 버전 — "위치를 얻으면 쓰고,
 * 못 얻으면(권한 거부/타임아웃/미지원 등) 좌표 없이 그냥 이어서 진행"하면 되는
 * 일회성 호출부용(오늘의 날씨 버튼, 날씨 화면의 "현재 위치" 재요청 등). 이런
 * 곳은 실패 이유를 구분할 필요가 없다 — 날씨 API 명세서 5장: 좌표를 안 보내면
 * 서버가 ASK_LOCATION으로 되물을 뿐, 그 자체가 실패가 아니라 정상 분기다.
 */
export async function getCurrentPositionOrNull(options) {
  try {
    return await getCurrentPosition(options)
  } catch {
    return null
  }
}
