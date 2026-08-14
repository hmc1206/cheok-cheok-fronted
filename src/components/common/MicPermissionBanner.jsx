// 마이크 권한이 'denied'일 때 화면 상단에 계속 보이는 안내 배너. 브라우저가 거부
// 상태를 기억해서 getUserMedia를 재호출해도 팝업 없이 바로 거부가 돌아오므로,
// 여기서 다시 시도하는 버튼/자동 재시도 로직은 두지 않는다(요구사항 5) — 사용자가
// 브라우저 설정에서 직접 허용해야만 풀리는 상태라, 그 경로를 문구로 안내만 한다.
export function MicPermissionBanner() {
  return (
    <div
      className="fixed inset-x-0 top-0 z-[90] px-4 py-3 text-center"
      style={{
        background: 'var(--color-bg-alt)',
        borderBottom: '1px solid var(--color-gray-light)',
        fontSize: 'var(--text-caption)',
        color: 'var(--color-text)',
      }}
      role="alert"
    >
      마이크 권한이 거부되었어요. 브라우저 주소창 옆 자물쇠 아이콘 &gt; 사이트 설정에서
      마이크를 허용해주세요.
    </div>
  )
}
