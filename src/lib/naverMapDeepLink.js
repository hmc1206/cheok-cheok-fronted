// nmap://route/public 딥링크 생성 + OS별 실행 + 앱 미설치 시 스토어 fallback.

const IOS_APP_STORE_URL = 'https://apps.apple.com/app/id311867728' // 네이버 지도 iOS
const ANDROID_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.nhn.android.nmap'

// TODO: 네이버 개발자센터에 등록한 실제 appname으로 교체해야 한다 (현재 placeholder).
// appname은 보통 등록된 URL scheme이나 패키지명 형태의 앱 식별자다.
const APP_NAME = 'TODO_APP_NAME'

function detectMobileOS() {
  const userAgent = navigator.userAgent || ''
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios'
  if (/Android/i.test(userAgent)) return 'android'
  return 'unknown'
}

/**
 * @param {{name:string, lat:number, lng:number}} origin
 * @param {{name:string, lat:number, lng:number}} destination
 */
export function buildNaverMapRouteUrl(origin, destination) {
  const params = new URLSearchParams({
    slat: String(origin.lat),
    slng: String(origin.lng),
    sname: origin.name,
    dlat: String(destination.lat),
    dlng: String(destination.lng),
    dname: destination.name,
    appname: APP_NAME,
  })
  return `nmap://route/public?${params.toString()}`
}

/**
 * 딥링크를 실행하고, 일정 시간 안에 앱으로 전환되지 않으면(=앱 미설치로 추정) 스토어로 보낸다.
 *
 * 동작 원리: 앱이 설치돼 있으면 딥링크 실행 즉시 OS가 앱을 전면에 띄우면서 브라우저 탭이
 * 백그라운드로 전환되고, 이때 document의 visibilitychange 이벤트가 발생한다(document.hidden
 * === true). fallbackDelayMs가 지날 때까지 이 이벤트가 한 번도 안 일어났다면, 딥링크를 처리할
 * 앱이 없어서 아무 반응도 없었다는 뜻이므로 그때 스토어로 보낸다.
 * (100% 정확한 감지 방법은 아니지만, 앱 설치 여부를 서버 없이 프론트에서 추정하는 표준적인 방식이다.)
 */
export function openNaverMapRoute(origin, destination, { fallbackDelayMs = 1500 } = {}) {
  const os = detectMobileOS()
  const deepLinkUrl = buildNaverMapRouteUrl(origin, destination)

  let didHide = false
  const handleVisibilityChange = () => {
    if (document.hidden) didHide = true
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)

  window.location.href = deepLinkUrl

  setTimeout(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    if (didHide) return // 앱이 열렸으므로 스토어로 보낼 필요 없음

    if (os === 'ios') {
      window.location.href = IOS_APP_STORE_URL
    } else if (os === 'android') {
      window.location.href = ANDROID_PLAY_STORE_URL
    }
    // 데스크톱 등 모바일이 아닌 환경은 스토어 fallback 대상이 아니므로 그냥 둔다.
  }, fallbackDelayMs)
}
