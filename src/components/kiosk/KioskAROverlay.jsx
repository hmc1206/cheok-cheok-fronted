/**
 * 7. 단계별 AR 안내 오버레이 Component
 *
 * WebXR이나 백엔드 ML 대신 HTML/CSS 기술을 활용해
 * 노란색 강조 테두리, 바운싱 화살표, 안내 말풍선, 어두운 딤 배경을 표시합니다.
 *
 * target 좌표 계산:
 * target.x, target.y는 퍼센트 단위 중심 좌표입니다.
 * left = target.x - (target.width / 2)
 * top = target.y - (target.height / 2)
 */
export function KioskAROverlay({ step }) {
  if (!step || !step.target) return null

  const { x, y, width, height } = step.target

  const left = x - width / 2
  const top = y - height / 2

  // 말풍선 위치 조정 (target이 화면 하단에 너무 가까우면 위에 띄우기)
  const isSpeechBubbleTop = top > 55

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {/* 1. 강조 박스 외곽을 어둡게 강조하기 위한 박스 그림자 오버레이 효과 */}
      <div
        className="absolute rounded-2xl border-4 border-yellow-400 bg-yellow-400/20 animate-ar-pulse pointer-events-auto transition-all duration-500 ease-out"
        style={{
          left: `${left}%`,
          top: `${top}%`,
          width: `${width}%`,
          height: `${height}%`,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)', // 강조 박스 이외의 영역을 자연스럽게 어둡게 만듦
        }}
        aria-label={`강조 영역: ${step.title}`}
      >
        {/* 2. 화살표 가이드 (상단 또는 하단에 위치) */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center animate-ar-bounce ${
            isSpeechBubbleTop ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {isSpeechBubbleTop ? (
            /* 위쪽 화살표 */
            <svg
              className="w-8 h-8 text-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 4l-8 8h6v8h4v-8h6z" />
            </svg>
          ) : (
            /* 아래쪽 화살표 */
            <svg
              className="w-8 h-8 text-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 20l8-8h-6V4h-4v8H6z" />
            </svg>
          )}
        </div>

        {/* 3. 말풍선 가이드 */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 w-max max-w-[280px] bg-neutral-900/95 text-white border-2 border-yellow-400 p-3 rounded-2xl shadow-2xl backdrop-blur-sm transition-all duration-300 pointer-events-auto ${
            isSpeechBubbleTop ? 'bottom-full mb-11' : 'top-full mt-11'
          }`}
        >
          <p className="text-yellow-300 font-extrabold text-base leading-tight flex items-center gap-1.5">
            <span>👇</span> {step.title}
          </p>
          <p className="text-neutral-100 text-sm font-medium mt-1 leading-snug">{step.description}</p>
        </div>
      </div>
    </div>
  )
}
