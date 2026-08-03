/**
 * 6. 키오스크 정렬 화면 Component
 *
 * 카메라 오버레이에 가이드 사각형을 띄우고 위치 정렬을 유도합니다.
 * 실제 이미지 인식 없이 "화면을 맞췄어요" 버튼 클릭 시 단계별 AR 안내 단계로 진입합니다.
 */
export function KioskAlignmentOverlay({ onConfirmAlignment, onBack, onExit }) {
  return (
    <div className="absolute inset-0 flex flex-col justify-between z-20 pointer-events-auto bg-black/40 backdrop-blur-[2px]">
      {/* 상단 툴바 */}
      <header className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent text-white">
        <button
          type="button"
          onClick={onBack}
          className="p-3 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg bg-black/40 hover:bg-black/60 focus-visible:outline-3 focus-visible:outline-white"
          aria-label="이전 화면으로 돌아가기"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h2 className="text-xl font-bold tracking-tight text-white shadow-sm">키오스크 화면 맞추기</h2>

        <button
          type="button"
          onClick={onExit}
          className="p-3 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg bg-black/40 hover:bg-black/60 focus-visible:outline-3 focus-visible:outline-white"
          aria-label="종료하고 홈으로 이동"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      {/* 중앙 둥근 사각형 가이드 영역 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 my-2">
        <div className="w-full max-w-[340px] aspect-[3/4] border-4 border-dashed border-yellow-400 rounded-3xl flex flex-col items-center justify-center p-6 text-center shadow-2xl bg-black/20 backdrop-brightness-125">
          <div className="bg-black/70 px-4 py-3 rounded-2xl border border-yellow-400/50 shadow-md">
            <p className="text-yellow-300 font-bold text-lg leading-snug">
              키오스크 화면을
              <br />이 안에 맞춰주세요
            </p>
          </div>
        </div>
      </div>

      {/* 하단 설명 및 완료 버튼 */}
      <footer className="p-6 bg-gradient-to-t from-black/90 via-black/80 to-transparent flex flex-col gap-4 text-center">
        <p className="text-white text-base font-medium leading-snug drop-shadow-md">
          화면 전체가 사각형 안에 보이도록
          <br />
          휴대폰을 천천히 움직여주세요.
        </p>

        <button
          type="button"
          onClick={onConfirmAlignment}
          className="w-full min-h-[60px] bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 text-black font-extrabold text-[20px] rounded-2xl flex items-center justify-center gap-2 shadow-xl transition-all focus-visible:outline-4 focus-visible:outline-white"
        >
          <span>화면을 맞췄어요</span>
          <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </footer>
    </div>
  )
}
