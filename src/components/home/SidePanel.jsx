import { useNavigate } from 'react-router-dom'

// 햄버거 메뉴로 여는 사이드 드로어. 히스토리/알람 설정 데이터를 props로 받는
// 독립 컴포넌트로 분리해서, HomeScreen은 상태(열림 여부, 히스토리 배열)만 들고
// 있고 실제 목록 렌더링은 여기서 담당한다.
export function SidePanel({ isOpen, onClose, history }) {
  const navigate = useNavigate()

  const handleOpenNotificationSettings = () => {
    onClose() // 드로어를 닫고 나서 이동 — 뒤로가기로 돌아왔을 때 드로어가 열린 채로 남지 않게.
    navigate('/notification-settings')
  }

  return (
    <>
      {/* 오버레이: 뒤쪽을 어둡게 덮고, 바깥(오버레이) 클릭 시 닫히게 한다.
          AppFrame 내부 div에 transform이 걸려 있어 fixed가 브라우저 전체가 아니라
          393x852 프레임 기준으로 잡힌다(다른 화면의 CaptionOverlay와 동일한 원리). */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} role="presentation" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[78%] max-w-[300px] flex-col gap-4 overflow-y-auto p-5 transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'var(--color-bg)', boxShadow: 'var(--shadow-card)' }}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between">
          <h2 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-text)' }}>
            메뉴
          </h2>
          {/* 56px 최소 터치 영역 — 노인 사용자가 오터치 없이 닫기 버튼을 누를 수 있게. */}
          <button
            type="button"
            onClick={onClose}
            aria-label="메뉴 닫기"
            className="flex items-center justify-center"
            style={{ width: 56, height: 56, fontSize: 'var(--text-title)', color: 'var(--color-gray)' }}
          >
            ×
          </button>
        </div>

        {/* /notification-settings로 이동 — 세컨더리 버튼 스타일(.quick-action-button)을
            그대로 써서 앱 전체 버튼 톤과 통일. */}
        <button type="button" onClick={handleOpenNotificationSettings} className="quick-action-button w-full">
          알람 설정
        </button>

        <div className="flex flex-col gap-2">
          <h3 style={{ fontSize: 'var(--text-body)', color: 'var(--color-gray)' }}>히스토리</h3>

          {history.length === 0 && (
            <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-gray)' }}>
              아직 대화 기록이 없어요.
            </p>
          )}

          <ul className="flex flex-col gap-3">
            {/* 최신 기록이 위로 오도록 뒤집어서 표시한다 (history 자체는 시간순으로 누적됨). */}
            {[...history].reverse().map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-1 border-b pb-2"
                style={{ borderColor: 'var(--color-gray-light)' }}
              >
                <p style={{ fontSize: 'var(--text-body)', fontWeight: 700, color: 'var(--color-text)' }}>
                  {entry.question}
                </p>
                <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-gray)' }}>{entry.answer}</p>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </>
  )
}
