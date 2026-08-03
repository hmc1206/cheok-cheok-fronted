/**
 * 키오스크 도움 반응형 모바일 프리셋 레이아웃 컨테이너
 *
 * 조건:
 * - 모바일 세로 화면 우선
 * - 전체 콘텐츠 최대 너비 480px (max-w-[480px])
 * - 데스크톱 화면 중앙 정렬 (mx-auto)
 * - 최소 높이 100dvh (min-h-dvh)
 * - 가로 스크롤 방지 (overflow-x-hidden)
 * - 390px 너비 기기에서 잘리지 않도록 안전 여백 처리
 */
export function KioskMobileLayout({ children, className = '' }) {
  return (
    <div className="w-full min-h-dvh bg-neutral-900 flex justify-center items-stretch overflow-x-hidden">
      <main
        className={`w-full max-w-[480px] min-h-dvh bg-white text-neutral-900 flex flex-col relative shadow-2xl overflow-x-hidden ${className}`}
      >
        {children}
      </main>
    </div>
  )
}
