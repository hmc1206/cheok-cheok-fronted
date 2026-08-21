// 여러 화면에서 공유하는 최소한의 선 아이콘. 새 아이콘 라이브러리를 추가하지 않고
// 직접 그린 SVG라 stroke=currentColor로 버튼의 글자색을 그대로 물려받는다.

// 마이크 아이콘. 홈 화면 중앙 마이크 버튼과, 길찾기 화면의 보조 마이크 버튼이
// 완전히 같은 모양을 쓰도록 이 파일 하나로 모았다.
export function MicIcon({ size = 28 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 19v3" />
    </svg>
  )
}

// 음성 파형(waveform) 아이콘. 채팅 페이지 하단 입력바에서 마이크 아이콘과 나란히
// 쓴다 — 높이가 서로 다른 막대 5개로 "소리"를 표현하는 흔한 관례적 형태.
export function WaveformIcon({ size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M3 12v0M7 8v8M11 4v16M15 8v8M19 12v0" />
    </svg>
  )
}
