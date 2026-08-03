/**
 * 5. 카메라 오류 화면 Component
 *
 * 브라우저의 기본 깨진 비디오 아이콘이나 검은 화면 대신
 * 한국어 커스텀 안내문과 "다시 시도", "카메라 없이 도움받기" 액션 버튼을 제공합니다.
 *
 * 처리 에러 구분:
 * - NotAllowedError: 권한 거부
 * - NotFoundError: 카메라 없음
 * - SecurityError: HTTPS 미사용
 * - NotReadableError / OverconstrainedError / 기타: 일반 오류
 */
export function CameraErrorUI({ errorType, onRetry, onBypassCamera }) {
  let errorMessage = '카메라를 실행하는 중 문제가 발생했어요.'

  switch (errorType) {
    case 'NotAllowedError':
      errorMessage = '브라우저 설정에서 카메라 권한을 허용한 후 다시 시도해주세요.'
      break
    case 'NotFoundError':
      errorMessage = '사용할 수 있는 카메라를 찾지 못했어요.'
      break
    case 'SecurityError':
      errorMessage = '카메라 기능은 안전한 HTTPS 환경에서 사용할 수 있어요.'
      break
    case 'NotReadableError':
    case 'OverconstrainedError':
    default:
      errorMessage = '카메라를 실행하는 중 문제가 발생했어요.'
      break
  }

  return (
    <div className="flex flex-col justify-between flex-1 p-6 pb-8 bg-neutral-50">
      <div className="mt-8 flex flex-col items-center text-center gap-6">
        {/* 오류 커스텀 경고 아이콘 */}
        <div className="w-20 h-20 rounded-full bg-red-100 border-2 border-red-300 flex items-center justify-center text-red-600 shadow-sm">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <div className="space-y-3 px-2">
          <h2 className="text-2xl font-extrabold text-neutral-900 leading-snug">카메라를 사용할 수 없어요</h2>
          <p className="text-lg text-neutral-700 leading-relaxed font-medium whitespace-pre-line">{errorMessage}</p>
        </div>

        {/* 도움말 박스 */}
        <div className="w-full bg-white border border-neutral-300 rounded-xl p-4 text-left shadow-sm space-y-2">
          <p className="text-base font-bold text-neutral-900">💡 해결 방법 가이드</p>
          <ul className="text-sm text-neutral-600 space-y-1 list-disc list-inside">
            <li>주소창 옆의 자물쇠/카메라 아이콘을 눌러 권한을 허용해 보세요.</li>
            <li>데스크톱 환경인 경우 [카메라 없이 도움받기]로 시뮬레이션할 수 있습니다.</li>
          </ul>
        </div>
      </div>

      {/* 액션 버튼 영역 */}
      <div className="mt-8 space-y-3">
        <button
          type="button"
          onClick={onRetry}
          className="w-full min-h-[56px] bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all focus-visible:outline-4 focus-visible:outline-blue-800"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>다시 시도</span>
        </button>

        <button
          type="button"
          onClick={onBypassCamera}
          className="w-full min-h-[56px] bg-neutral-200 hover:bg-neutral-300 text-neutral-900 font-bold text-lg rounded-2xl flex items-center justify-center gap-2 transition-all focus-visible:outline-4 focus-visible:outline-neutral-800"
        >
          <span>카메라 없이 도움받기</span>
        </button>
      </div>
    </div>
  )
}
