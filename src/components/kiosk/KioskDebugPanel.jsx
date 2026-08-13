/**
 * 개발(DEV) 환경 전용 디버그 오버레이.
 * 브랜드 판별 결과, 현재 단계, OCR 인식 단어, 타겟 매칭 정보를 화면 한쪽에 작게 표시하고
 * OCR이 찾은 단어들의 bounding box를 얇은 선으로 그려 실제로 잘 인식되는지 확인할 수 있게 한다.
 * 프로덕션 사용자 화면에는 렌더링되지 않는다(KioskLiveScreen에서 import.meta.env.DEV로 분기).
 */
export function KioskDebugPanel({
  brand,
  brandConfidence,
  orderState,
  phase,
  stateConfidence,
  ocrWords,
  targetMatch,
  processingMs,
  debugInfo,
}) {
  const confidencePercent = Math.round((brandConfidence ?? 0) * 100)
  const stateConfidencePercent = Math.round((stateConfidence ?? 0) * 100)
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
        <p>Brand: {brand ?? '-'}</p>
        <p>Brand confidence: {confidencePercent}%</p>
        <p>
          State: {orderState ?? '-'}
          {phase ? ` (${phase})` : ''}
        </p>
        <p>State confidence: {stateConfidencePercent}%</p>
        <p className="line-clamp-2 break-words">OCR: {ocrWords?.length ? ocrWords.map((w) => w.text).join(' / ') : '-'}</p>
        <p className="truncate">Target: {targetMatch?.text ?? '-'}</p>
        <p>Target found: {targetMatch ? 'true' : 'false'}</p>
        <p>Target confidence: {targetConfidencePercent !== null ? `${targetConfidencePercent}%` : '-'}</p>
        <p>OCR processing: {processingMs ?? 0}ms</p>
        {debugInfo && (
          <>
            <p className="pt-1 border-t border-lime-400/30">
              Video: {debugInfo.videoSize.width}x{debugInfo.videoSize.height}
            </p>
            <p>
              Display: {debugInfo.displaySize.width}x{debugInfo.displaySize.height}
            </p>
            <p>
              ROI: x={Math.round(debugInfo.roi.x)}, y={Math.round(debugInfo.roi.y)}, w=
              {Math.round(debugInfo.roi.width)}, h={Math.round(debugInfo.roi.height)}
            </p>
            <p>
              Canvas: {debugInfo.canvasSize.width}x{debugInfo.canvasSize.height}
            </p>
          </>
        )}
      </div>

      {/* ROI crop 결과 미리보기 - 실제로 어떤 이미지를 Tesseract에 넘기고 있는지 눈으로 확인 */}
      {debugInfo?.canvasPreviewUrl && (
        <div className="absolute top-2 right-2 z-30 pointer-events-none select-none">
          <img
            src={debugInfo.canvasPreviewUrl}
            alt="OCR ROI crop preview"
            className="max-w-[120px] max-h-[160px] border-2 border-lime-400 bg-black/50 object-contain"
          />
        </div>
      )}
    </>
  )
}
