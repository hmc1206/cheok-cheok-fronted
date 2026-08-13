/**
 * 특정 버튼 위치를 정확히 짚어줄 수 없는 안내(예: "화면을 위로 밀어주세요",
 * "아래쪽 카드 투입구에 카드를 넣어주세요")를 위한 방향성 힌트 오버레이.
 *
 * 카메라 화면 전체를 어둡게 가리지 않는다 - 사용자가 실제 키오스크를 계속 조작해야 하므로
 * (스크롤하거나 카드를 넣는 등) 시야를 가리지 않는 가벼운 카드 형태로만 안내한다.
 * 기존 AR 오버레이와 같은 노란/검정 말풍선 색상 언어를 재사용해 디자인을 통일한다.
 */
export function KioskDirectionHint({ title, description, direction = 'up' }) {
  const isDown = direction === 'down'

  return (
    <div
      className={`absolute inset-x-0 z-10 flex flex-col items-center pointer-events-none ${isDown ? 'bottom-40' : 'top-6'}`}
    >
      {!isDown && (
        <div className="flex flex-col items-center animate-ar-bounce mb-3">
          <svg
            className="w-9 h-9 text-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 4l-8 8h6v8h4v-8h6z" />
          </svg>
          <span className="text-3xl leading-none" aria-hidden="true">
            👆
          </span>
        </div>
      )}

      <div className="max-w-[280px] bg-neutral-900/95 text-white border-2 border-yellow-400 p-3 rounded-2xl shadow-2xl backdrop-blur-sm text-center pointer-events-auto">
        <p className="text-yellow-300 font-extrabold text-base leading-tight">{title}</p>
        <p className="text-neutral-100 text-sm font-medium mt-1 leading-snug">{description}</p>
      </div>

      {isDown && (
        <div className="flex flex-col items-center animate-ar-bounce mt-3">
          <span className="text-3xl leading-none" aria-hidden="true">
            👇
          </span>
          <svg
            className="w-9 h-9 text-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 20l8-8h-6V4h-4v8H6z" />
          </svg>
        </div>
      )}
    </div>
  )
}
