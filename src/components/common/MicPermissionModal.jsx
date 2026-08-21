import { useState } from 'react'
import { SeniorButton } from '../ui/SeniorButton'

// 마이크 권한이 'prompt'(아직 물어본 적 없음) 상태일 때 보여주는 안내 모달.
// 브라우저 네이티브 팝업을 곧바로 띄우지 않고, 이 모달로 먼저 맥락을 설명한 뒤
// 사용자가 "허용하기"를 눌러야 실제 getUserMedia가 호출되도록 한 단계 둔다.
//
// onAllow는 useMicPermission().requestPermission을 그대로 받는데, 그 함수 내부의
// getUserMedia 호출이 반드시 "사용자 클릭 이벤트 핸들러 안"에서 실행되어야 Safari
// 등에서도 팝업이 뜬다 — 그래서 여기 버튼 onClick에 onAllow를 직접 연결한다
// (사이에 다른 비동기 처리를 끼워넣지 않는다).
export function MicPermissionModal({ onAllow }) {
  // 전역 권한 상태(idle/prompt/granted/denied)는 그대로 두고, "지금 이 모달만
  // 잠깐 닫아달라"는 로컬 요청은 이 컴포넌트 안에서만 처리한다 — 새로고침하면
  // 권한 상태가 여전히 prompt라 모달이 다시 뜬다(의도된 동작).
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{ background: 'rgba(9, 38, 53, 0.5)' }}
      role="presentation"
      onClick={() => setDismissed(true)}
    >
      <div
        className="app-card flex w-full max-w-sm flex-col gap-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mic-permission-title"
        onClick={(event) => event.stopPropagation()}
      >
        {/* QA 중 발견: var(--text-body-lg)가 어디에도 정의돼 있지 않은 값이라
            (index.css 참고 — .app-card와 같은 구 토큰 체계 잔재) 브라우저
            기본 글자 크기로만 보이고 있었다. 이 앱의 기본 본문 크기(18px,
            MobileHeader 제목과 동일한 크기)로 맞춘다. */}
        <p
          id="mic-permission-title"
          style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)' }}
        >
          이 앱은 음성 기능을 위해 마이크 접근이 필요합니다
        </p>
        {/* QA 중 발견: 기존 PrimaryButton(components/common/Button.jsx)이 쓰던
            .primary-button 클래스도 .app-card와 같은 이유로 index.css에 정의돼
            있지 않아 배경 없는 맨 텍스트로만 보이고 있었다. 그 컴포넌트를 고치는
            대신, 이 앱에서 실제로 쓰이고 있는 공용 버튼(SeniorButton — 구글
            로그인/다시 시도 등 다른 모든 주요 액션 버튼과 동일)으로 교체한다 —
            onAllow(getUserMedia 호출)는 여전히 이 버튼의 클릭 핸들러에 직접
            연결되어 있어 "사용자 클릭 이벤트 핸들러 안에서 호출"이라는 조건은
            그대로 유지된다. */}
        <SeniorButton type="button" onClick={onAllow}>
          허용하기
        </SeniorButton>
      </div>
    </div>
  )
}
