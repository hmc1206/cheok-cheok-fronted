// 홈 화면에서 시작된 유리 재질(glassmorphism) 버튼/입력창을 다른 화면에서도 그대로
// 쓸 수 있도록 모아둔 공용 컴포넌트 모음 (길찾기 화면도 이 모듈을 그대로 재사용).
// 색상/배경 값은 glassTokens.js에 따로 두고, 여기는 컴포넌트만 export한다.
//
// Tailwind는 클래스 문자열을 빌드 타임에 정적으로 스캔하므로, 여기 쓰인 임의값 클래스
// (bg-[#146156]/60 등)는 변수로 조립하지 않고 리터럴로 고정한다 — 그래야 실제로 CSS가
// 생성된다.

const GLASS_INTERACTIVE_CLASS =
  'border border-white/30 backdrop-blur-md transition-colors duration-200 ' +
  'bg-[#146156]/60 hover:bg-[#0f4a41]/75 active:bg-[#0f4a41]/85 ' +
  'disabled:opacity-50 disabled:hover:bg-[#146156]/60 disabled:cursor-not-allowed'

// Tailwind shadow-*는 무채색이라, 유리 컴포넌트가 브랜드 컬러 위에 떠 있는 느낌을
// 내려고 색이 들어간 그림자를 인라인으로 준다 (버튼/입력창 공통).
const GLASS_SHADOW = '0 8px 24px rgba(20, 97, 86, 0.28)'

// 원형 유리 버튼 (홈 화면 3개 바로가기 + 마이크 버튼에서 사용).
export function GlassCircleButton({ children, onClick, disabled, size = 100, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`flex flex-col items-center justify-center gap-1 rounded-full text-white text-center ${GLASS_INTERACTIVE_CLASS}`}
      style={{ width: size, height: size, boxShadow: GLASS_SHADOW }}
    >
      {children}
    </button>
  )
}

// 알약 모양 유리 버튼. 텍스트 위주의 실행 버튼(길찾기 등)에서 GlassCircleButton 대신 쓴다.
export function GlassButton({ children, onClick, disabled, type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-full px-6 py-3 text-center font-bold text-white ${GLASS_INTERACTIVE_CLASS}`}
      style={{ boxShadow: GLASS_SHADOW }}
    >
      {children}
    </button>
  )
}

// 유리 느낌 텍스트 입력창. hasError면 테두리를 경고색으로 바꿔 재입력을 유도한다
// (지도 화면의 GEOCODE_NOT_FOUND 필드별 에러 표시에 사용).
export function GlassInput({ value, onChange, placeholder, hasError, ...rest }) {
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={
        'w-full rounded-2xl border px-4 py-3 text-white placeholder-white/70 backdrop-blur-md ' +
        'bg-[#146156]/40 outline-none transition-colors duration-200 ' +
        (hasError ? 'border-red-300 focus:border-red-300' : 'border-white/30 focus:border-white/70')
      }
      {...rest}
    />
  )
}
