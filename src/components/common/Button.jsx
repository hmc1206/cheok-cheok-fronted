// 디자인 개편(feature/fe-redesign) 공용 버튼 2종. 기존 유리(glassmorphism) 버튼
// 시스템(Glass.jsx)을 대체한다 — 새 디자인 브리프가 "flat by default, accent는
// --color-primary 하나만, 그림자는 카드에만" 을 원칙으로 두기 때문에, 반투명/블러
// 스타일은 이 개편에서 전부 걷어냈다.

// 메인 액션 버튼(필 모양). 화면당 "가장 하고 싶은 행동" 하나에만 쓴다
// (예: 로그인 화면의 구글 로그인, 길찾기 화면의 검색 실행).
export function PrimaryButton({ children, onClick, disabled, type = 'button', className = '' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`primary-button ${className}`}
    >
      {children}
    </button>
  )
}

// 아이콘 전용 버튼(56×56 최소 터치 영역 — 웹 표준 44px보다 크게 잡은 건 노인 사용자가
// 오터치 없이 누르기 위한 접근성 요구사항). 아이콘 뒤에 --color-secondary 칩 배경을
// 깔아 클릭 가능 영역을 시각적으로 넓혀 보이게 한다. 홈 화면 바로가기, 마이크 버튼
// 등 "아이콘 하나 + 짧은 라벨"로 구성되는 반복 액션에 쓴다.
export function IconChipButton({ children, label, onClick, disabled, size = 64, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      className="icon-chip-button"
      style={{ width: size, height: size }}
    >
      {children}
    </button>
  )
}
