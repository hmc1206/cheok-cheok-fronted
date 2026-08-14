// 배경 없이 아이콘만 있는 햄버거 메뉴 버튼. 홈 화면에서 처음 만들었고(피드백:
// "초록 배경 칩 제거, 아이콘만 남기고 클릭 영역은 44px 유지"), 채팅 페이지에서도
// 똑같은 스타일/위치가 필요해 공용 컴포넌트로 뺐다 — 두 화면이 서로 다른 스타일로
// 어긋나지 않도록 마크업을 한 곳에서만 관리한다.
export function HamburgerMenuButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="메뉴 열기"
      className="absolute left-4 top-4 z-20 flex items-center justify-center"
      style={{
        width: 44,
        height: 44,
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        color: 'var(--color-text)',
      }}
    >
      <MenuIcon />
    </button>
  )
}

function MenuIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}
