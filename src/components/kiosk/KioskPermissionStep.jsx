/**
 * 3. 카메라 권한 안내 화면 Component
 *
 * 사용자가 "카메라로 키오스크 비추기" 버튼을 클릭했을 때 바로 카메라를 켜지 않고
 * 명시적 권한 안내와 개인정보(서버 미저장) 안심 문구를 표시한 후 동의 버튼 클릭 시에만 카메라를 실행합니다.
 */
export function KioskPermissionStep({ onRequestPermission, onBack }) {
  return (
    <div className="flex flex-col justify-between flex-1 p-6 pb-8">
      <div>
        {/* 상단 헤더 */}
        <div className="flex items-center gap-3 py-3 border-b border-neutral-200">
          <button
            type="button"
            onClick={onBack}
            className="p-3 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg hover:bg-neutral-100 focus-visible:outline-3 focus-visible:outline-blue-600"
            aria-label="이전 화면으로 돌아가기"
          >
            <svg
              className="w-7 h-7 text-neutral-800"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-neutral-900">권한 안내</h1>
        </div>

        {/* 권한 안내 내용 */}
        <section className="mt-10 flex flex-col items-center text-center gap-6 px-2">
          {/* 보안/카메라 권한 아이콘 */}
          <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-amber-600 shadow-sm">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-extrabold text-neutral-900 leading-snug">카메라 사용이 필요해요</h2>
            <p className="text-lg text-neutral-700 leading-relaxed font-medium whitespace-pre-line">
              키오스크 화면을 확인하기 위해
              <br />
              카메라 권한을 허용해주세요.
            </p>
          </div>

          {/* 개인정보 안전 박스 */}
          <div className="w-full bg-neutral-100 border border-neutral-300 rounded-xl p-4 mt-2 text-left flex items-start gap-3">
            <svg
              className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="space-y-1">
              <p className="text-base font-bold text-neutral-900">안심하세요!</p>
              <p className="text-sm font-medium text-neutral-700">카메라 화면은 서버에 저장되지 않습니다.</p>
            </div>
          </div>
        </section>
      </div>

      {/* 하단 동의 및 카메라 허용 버튼 */}
      <div className="mt-8 pt-4 space-y-3">
        <button
          type="button"
          onClick={onRequestPermission}
          className="w-full min-h-[60px] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-[20px] rounded-2xl flex items-center justify-center gap-3 shadow-lg transition-all focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <span>카메라 허용하기</span>
        </button>

        <button
          type="button"
          onClick={onBack}
          className="w-full min-h-[48px] bg-transparent text-neutral-600 hover:text-neutral-900 font-semibold text-base py-2"
        >
          취소하고 돌아가기
        </button>
      </div>
    </div>
  )
}
