// STT 인식 결과 + TTS 응답을 동시에 자막으로 보여주는 공용 컴포넌트.
// 모든 화면 하단에 공통 배치한다 (기획서 3-3장, 청각+시각 이중 안내 원칙).
export function CaptionOverlay({ sttCaption, ttsCaption }) {
  if (!sttCaption && !ttsCaption) return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 flex flex-col gap-2 p-4"
      style={{ background: 'var(--color-bg-alt)', borderTop: '1px solid var(--color-gray-light)' }}
    >
      {sttCaption && (
        <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-gray)' }}>나: {sttCaption}</p>
      )}
      {ttsCaption && (
        <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text)' }}>
          척척이: {ttsCaption}
        </p>
      )}
    </div>
  )
}
