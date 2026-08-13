// 백엔드(POST /api/v1/routes/naver-link)가 이미 완성해서 준 앱/웹 URL로 딥링크를
// 실행한다. URL 자체는 프론트에서 조립하지 않는다 — 좌표 변환/딥링크 조립은 전부
// 백엔드 책임이고, 프론트는 받은 두 URL 중 하나를 여는 실행만 담당한다.

/**
 * 딥링크(appUrl)를 실행하고, 일정 시간 안에 앱으로 전환되지 않으면(=앱 미설치로 추정)
 * 웹 페이지(webUrl)로 대신 이동한다.
 *
 * 동작 원리: 앱이 설치돼 있으면 딥링크 실행 즉시 OS가 앱을 전면에 띄우면서 브라우저
 * 탭이 백그라운드로 전환되고, 이때 document의 visibilitychange 이벤트가 발생한다
 * (document.hidden === true). fallbackDelayMs가 지날 때까지 이 이벤트가 한 번도 안
 * 일어났다면 딥링크를 처리할 앱이 없었다는 뜻이므로 그때 웹 URL로 보낸다.
 * (100% 정확한 감지 방법은 아니지만, 서버 없이 프론트에서 앱 설치 여부를 추정하는
 * 표준적인 방식이다.)
 */
export function openNaverMapWithWebFallback(appUrl, webUrl, { fallbackDelayMs = 1500 } = {}) {
  let didHide = false
  const handleVisibilityChange = () => {
    if (document.hidden) didHide = true
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)

  window.location.href = appUrl

  setTimeout(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    if (didHide) return // 앱이 열렸으므로 웹으로 보낼 필요 없음
    if (webUrl) window.location.href = webUrl
  }, fallbackDelayMs)
}
