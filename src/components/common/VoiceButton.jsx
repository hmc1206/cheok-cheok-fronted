import { MicIcon } from './icons'

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
      // 모양만 변경: 원형(rounded-full) -> 둥근 모서리 사각 박스. 클릭 핸들러,
      // disabled 조건, aria-label 등 기존 로직/접근성 속성은 그대로 둔다.
      // radius-lg(24px)를 써서 다른 카드형 박스들과 같은 둥근 모서리 톤을 맞췄다.
      className="voice-button w-full"
      style={{ minHeight: 120, borderRadius: 'var(--radius-lg)' }}
    >
      {/* 박스 바깥에 따로 있던 상태 텍스트(HomeScreen의 micStatusLabel)를 없애고,
          아이콘 + 텍스트를 박스 중앙에 세로로 쌓았다. 아이콘이 추가되면서 텍스트가
          기존(text-body-lg, 20px)만큼 크면 답답해 보여서 한 단계 낮춘
          text-body(18px)로 줄였다. */}
      <span className="flex flex-col items-center justify-center gap-2">
        <MicIcon size={32} />
        <span style={{ fontSize: 'var(--text-body)', fontWeight: 600 }}>{STATUS_LABEL[status]}</span>
      </span>
    </button>
  )
}
