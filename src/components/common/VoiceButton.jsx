// 크게 누를 수 있는 마이크 버튼. 상태값(prop)만 노출하고 시각 디자인은
// 디자이너 파일 적용 전까지 최소 placeholder로 둔다 (기획서 3-2장).
const STATUS_LABEL = {
  idle: '눌러서 말하기',
  listening: '듣는 중...',
  processing: '처리 중...',
}

export function VoiceButton({ status = 'idle', onPress }) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={status === 'processing'}
      aria-label="음성 비서 시작"
      data-status={status}
      className="rounded-full"
      style={{
        width: 'var(--voice-button-size)',
        height: 'var(--voice-button-size)',
        background: 'var(--color-primary)',
        color: 'var(--color-primary-contrast)',
        fontSize: 'var(--font-size-lg)',
        border: 'none',
      }}
    >
      {STATUS_LABEL[status]}
    </button>
  )
}
