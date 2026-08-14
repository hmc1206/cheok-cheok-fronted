// 마이크 권한 관련 브라우저 API 호출을 훅(React 로직)에서 분리해둔 순수 함수 모음.
// jest/vitest에서 useMicPermission을 테스트할 때 이 두 함수만 mocking하면 되게
// 하기 위한 구조다 (요구사항 8: getUserMedia 호출부 분리).

/**
 * 실제 브라우저 마이크 권한 팝업을 띄운다. Safari 등 일부 브라우저는 사용자 제스처
 * (클릭 등) 밖에서 호출된 getUserMedia를 무시하거나 실패시키므로, 이 함수는 반드시
 * 버튼 onClick 핸들러 안에서 직접 호출해야 한다 — useEffect 등에서 자동 호출 금지.
 *
 * 지금은 "권한 확보" 자체가 목적이라, 받아온 스트림의 트랙은 즉시 정리(stop)한다.
 * 실제 음성 인식 등에서 마이크를 쓸 때는 이 함수와 무관하게 그 기능에서 별도로
 * getUserMedia를 다시 호출한다.
 *
 * 권한이 거부되거나 장치가 없으면 getUserMedia가 reject하는 Promise를 그대로
 * 던진다 — 호출부(useMicPermission)에서 catch해서 상태를 'denied'로 갱신한다.
 */
export async function requestMicrophoneAccess() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  stream.getTracks().forEach((track) => track.stop())
}

/**
 * 브라우저 팝업을 띄우지 않고 "지금 마이크 권한이 어떤 상태인지"만 조회한다.
 * Permissions API(navigator.permissions.query) 미지원 브라우저(Safari 등)에서는
 * 이 API 자체가 없거나 { name: 'microphone' }을 거부할 수 있어, 그런 경우엔 아직
 * 물어본 적 없는 것으로 간주해 'prompt'를 돌려준다 — 사용자가 안내 모달을 보고
 * 직접 "허용하기"를 눌러야 실제 팝업이 뜨는 흐름으로 자연스럽게 이어진다.
 *
 * @returns {Promise<'granted'|'denied'|'prompt'|'unsupported'>}
 */
export async function queryMicrophonePermission() {
  if (!navigator.mediaDevices?.getUserMedia) return 'unsupported'
  if (!navigator.permissions?.query) return 'prompt'

  try {
    const result = await navigator.permissions.query({ name: 'microphone' })
    return result.state
  } catch {
    return 'prompt'
  }
}
