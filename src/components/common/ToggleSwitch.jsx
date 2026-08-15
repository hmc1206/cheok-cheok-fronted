// 접근성 있는 on/off 토글 스위치. 새 라이브러리를 추가하지 않고 순수 버튼으로
// 구현 — role="switch"/aria-checked로 스크린리더에도 상태가 전달된다.
// 스위치 자체 크기(52x32)는 웹 공통 토글 관례를 따랐다(다른 아이콘 버튼들의
// 56px 최소 터치 영역과는 별개 — 스위치는 라벨과 함께 있는 한 줄 전체가
// 눌리는 영역 역할을 하도록 화면에서 배치한다).
export function ToggleSwitch({ checked, onChange, ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className="toggle-switch"
      data-checked={checked}
    >
      <span className="toggle-switch-thumb" />
    </button>
  )
}
