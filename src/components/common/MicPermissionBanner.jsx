// 마이크 권한이 'denied'일 때 화면 상단에 계속 보이는 안내 배너. 브라우저가 거부
// 상태를 기억해서 getUserMedia를 재호출해도 팝업 없이 바로 거부가 돌아오므로,
// 여기서 다시 시도하는 버튼/자동 재시도 로직은 두지 않는다(요구사항 5) — 사용자가
// 브라우저 설정에서 직접 허용해야만 풀리는 상태라, 그 경로를 문구로 안내만 한다.
// QA 중 발견: background/borderBottom/fontSize가 참조하던 --color-bg-alt/
// --color-gray-light/--text-caption 모두 index.css 어디에도 정의돼 있지 않은
// 구 토큰(MicPermissionModal.jsx의 .app-card와 같은 원인) — 배경/테두리 없이
// 투명하게, 기본 브라우저 글자 크기로만 보이고 있었다. 지금 토큰으로 맞춘다 —
// 배경은 다른 화면의 안내 배너(.control-form-screen__hint)와 같은 옅은 파란
// (--cb-gold), 테두리는 앱 전역에서 쓰는 헤어라인(--cb-line), 글자 크기는 이
// 화면급 보조 설명 문구들과 같은 14px.
export function MicPermissionBanner() {
  return (
    <div
      className="fixed inset-x-0 top-0 z-[90] px-4 py-3 text-center"
      style={{
        background: 'var(--cb-gold)',
        borderBottom: '1px solid var(--cb-line)',
        fontSize: '14px',
        color: 'var(--color-text)',
      }}
      role="alert"
    >
      마이크 권한이 거부되었어요. 브라우저 주소창 옆 자물쇠 아이콘 &gt; 사이트 설정에서
      마이크를 허용해주세요.
    </div>
  )
}
