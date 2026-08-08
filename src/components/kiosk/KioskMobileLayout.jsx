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
// AppFrame(core 공용 컴포넌트)이 화면을 393x852로 고정하면서 이 레이아웃을 감싸므로,
// min-h-dvh(실제 뷰포트 기준)를 쓰면 852px 프레임을 넘어가버린다. h-full로 바꿔
// AppFrame이 준 높이를 그대로 채우고, overflow-y-auto로 넘치는 내용은 스크롤되게 한다.
export function KioskMobileLayout({ children, className = '' }) {
  return (
    <div className="w-full h-full bg-neutral-900 flex justify-center items-stretch overflow-x-hidden overflow-y-auto">
      <main
        className={`w-full max-w-[480px] h-full bg-white text-neutral-900 flex flex-col relative shadow-2xl overflow-x-hidden ${className}`}
      >
        {children}
      </main>
    </div>
  )
}
