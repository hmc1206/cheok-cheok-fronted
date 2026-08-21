// 접근성 있는 on/off 토글 스위치. 새 라이브러리를 추가하지 않고 순수 버튼으로
// 구현 — role="switch"/aria-checked로 스크린리더에도 상태가 전달된다.
// 스위치 자체 크기(52x32)는 웹 공통 토글 관례를 따랐다(다른 아이콘 버튼들의
// 56px 최소 터치 영역과는 별개 — 스위치는 라벨과 함께 있는 한 줄 전체가
// 눌리는 영역 역할을 하도록 화면에서 배치한다).
//
// B안(feat/senior-ui-refactor) 채택 후: 예전엔 index.css의 .toggle-switch/
// .toggle-switch-thumb 클래스로 스타일을 입혔는데, B안의 index.css 정리 과정에서
// 그 클래스들이 (어떤 화면도 참조하지 않아 죽은 코드로 분류되어) 삭제됐다 — 이
// 컴포넌트 자체가 최근까지 실제로 쓰이는 화면이 없었기 때문. 새로 만드는 설정
// 화면들이 이 컴포넌트를 다시 쓰게 되어, B안의 나머지 컴포넌트(SeniorButton 등)와
// 같은 방식 — 별도 CSS 클래스 없이 Tailwind + var(--cb-*) 토큰만으로 — 다시 스타일링했다.
export function ToggleSwitch({ checked, onChange, ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full p-1 transition-colors duration-150"
      style={{ background: checked ? 'var(--cb-tomato)' : 'var(--cb-line)' }}
    >
      <span
        className="block h-6 w-6 rounded-full bg-white shadow transition-transform duration-150"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  )
}
