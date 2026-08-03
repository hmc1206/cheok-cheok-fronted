/**
 * 2. 키오스크 도움 소개 화면 Component
 *
 * 구조:
 * - 상단: 뒤로가기 버튼, "키오스크 도움" 헤더
 * - 본문: 사용성 안내 문구
 * - 하단: "카메라로 키오스크 비추기" 대형 CTA 버튼 (높이 60px 이상, 글자 20px 이상)
 */
export function KioskIntroStep({ onNext, onBack }) {
  return (
    <div className="flex flex-col justify-between flex-1 p-6 pb-8">
      {/* 상단 헤더 영역 */}
      <div>
        <div className="flex items-center gap-3 py-3 border-b border-neutral-200">
          <button
            type="button"
            onClick={onBack}
            className="p-3 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg hover:bg-neutral-100 focus-visible:outline-3 focus-visible:outline-blue-600"
            aria-label="메인 화면으로 돌아가기"
          >
            {/* Lucide가 설치되지 않은 경우를 대비한 렌더링 검사 또는 SVG fallback */}
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
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">키오스크 도움</h1>
        </div>

        {/* 본문 설명 영역 */}
        <section className="mt-12 flex flex-col items-center text-center gap-6 px-2">
          {/* 친근한 그래픽 아이콘 영역 */}
          <div className="w-24 h-24 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-extrabold text-neutral-900 leading-snug">
              키오스크 사용이
              <br />
              어려우신가요?
            </h2>
            <p className="text-lg text-neutral-700 leading-relaxed font-medium whitespace-pre-line">
              카메라로 키오스크 화면을 비추면
              <br />
              <span className="text-blue-700 font-bold underline decoration-blue-300 underline-offset-4">
                눌러야 할 버튼
              </span>을 순서대로 알려드려요.
            </p>
          </div>
        </section>
      </div>

      {/* 하단 주요 액션 버튼 영역 (높이 60px 이상, 글자 크기 20px 이상) */}
      <div className="mt-8 pt-4">
        <button
          type="button"
          onClick={onNext}
          className="w-full min-h-[64px] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-[20px] rounded-2xl flex items-center justify-center gap-3 shadow-lg transition-all focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>카메라로 키오스크 비추기</span>
        </button>
      </div>
    </div>
  )
}
