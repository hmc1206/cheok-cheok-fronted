// 햄버거 메뉴로 여는 사이드 드로어. 히스토리/알람 설정 데이터를 props로 받는
// 독립 컴포넌트로 분리해서, HomeScreen은 상태(열림 여부, 히스토리 배열)만 들고
// 있고 실제 목록 렌더링은 여기서 담당한다.
export function SidePanel({ isOpen, onClose, history }) {
  return (
    <>
      {/* 오버레이: 뒤쪽을 어둡게 덮고, 바깥(오버레이) 클릭 시 닫히게 한다.
          AppFrame 내부 div에 transform이 걸려 있어 fixed가 브라우저 전체가 아니라
          393x852 프레임 기준으로 잡힌다(다른 화면의 CaptionOverlay와 동일한 원리). */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={onClose}
          role="presentation"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[78%] max-w-[300px] flex-col gap-4 overflow-y-auto bg-white p-5 shadow-xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between">
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>메뉴</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="메뉴 닫기"
            className="text-2xl leading-none"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ×
          </button>
        </div>

        {/* ASSUMPTION: 알람 설정 화면 자체는 아직 없어서, 이번 스코프에선 진입
            버튼 자리만 만들어둔다(추후 실제 설정 화면과 연결). */}
        <button type="button" className="quick-action-button w-full text-left">
          알람 설정
        </button>

        <div className="flex flex-col gap-2">
          <h3 style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-muted)' }}>
            히스토리
          </h3>

          {history.length === 0 && (
            <p style={{ color: 'var(--color-text-muted)' }}>아직 대화 기록이 없어요.</p>
          )}

          <ul className="flex flex-col gap-3">
            {/* 최신 기록이 위로 오도록 뒤집어서 표시한다 (history 자체는 시간순으로 누적됨). */}
            {[...history].reverse().map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-1 border-b pb-2"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <p style={{ fontWeight: 700 }}>{entry.question}</p>
                <p style={{ color: 'var(--color-text-muted)' }}>{entry.answer}</p>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </>
  )
}
