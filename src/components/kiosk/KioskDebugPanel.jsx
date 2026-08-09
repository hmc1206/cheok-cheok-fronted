/**
 * 개발(DEV) 환경 전용 디버그 오버레이.
 * 브랜드 판별 결과, 현재 단계, OCR 인식 단어, 타겟 매칭 정보를 화면 한쪽에 작게 표시하고
 * OCR이 찾은 단어들의 bounding box를 얇은 선으로 그려 실제로 잘 인식되는지 확인할 수 있게 한다.
 * 프로덕션 사용자 화면에는 렌더링되지 않는다(KioskLiveScreen에서 import.meta.env.DEV로 분기).
 */
export function KioskDebugPanel({ brand, orderState, ocrWords, targetMatch, processingMs }) {
  const confidencePercent = Math.round((brand?.confidence ?? 0) * 100)
  const targetConfidencePercent = targetMatch ? Math.round(targetMatch.confidence * 100) : null

  return (
    <>
      {/* OCR 인식 bounding box (얇은 선) */}
      <div className="absolute inset-0 z-30 pointer-events-none">
        {ocrWords?.map((word, index) => (
          <div
            key={`${word.text}-${index}`}
            className="absolute border border-lime-400/80"
            style={{
              left: `${word.x - word.width / 2}%`,
              top: `${word.y - word.height / 2}%`,
              width: `${word.width}%`,
              height: `${word.height}%`,
            }}
          />
        ))}
      </div>

      {/* 인식 상태 텍스트 패널 */}
      <div className="absolute top-2 left-2 z-30 max-w-[220px] rounded-lg bg-black/80 text-[10px] leading-tight text-lime-300 font-mono p-2 pointer-events-none select-none space-y-0.5">
        <p>Brand: {brand?.brand ?? '-'}</p>
        <p>Confidence: {confidencePercent}%</p>
        <p>State: {orderState}</p>
        <p className="line-clamp-2 break-words">OCR: {ocrWords?.length ? ocrWords.map((w) => w.text).join(' / ') : '-'}</p>
        <p className="truncate">Target: {targetMatch?.text ?? '-'}</p>
        <p>Target confidence: {targetConfidencePercent !== null ? `${targetConfidencePercent}%` : '-'}</p>
        <p>OCR processing: {processingMs ?? 0}ms</p>
      </div>
    </>
  )
}
