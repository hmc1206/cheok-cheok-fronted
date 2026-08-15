/**
 * 개발(DEV) 환경 전용 디버그 패널. 촬영 이미지 분석 결과(판별된 상태, confidence,
 * 매칭된 키워드, OCR 원문, 분석 소요 시간)를 화면 한쪽에 작게 표시한다.
 * 운영 화면에는 표시되지 않는다(KioskCaptureScreen에서 import.meta.env.DEV로 분기).
 */
export function AROverlayDebugPanel({ phase, recognitionResult, debugWords, lastAnalysisMs, ocrReady }) {
  const confidencePercent = Math.round((recognitionResult?.confidence ?? 0) * 100)

  return (
    <div className="absolute top-2 left-2 z-40 max-w-[220px] rounded-lg bg-black/80 text-[10px] leading-tight text-lime-300 font-mono p-2 pointer-events-none select-none space-y-0.5">
      <p>Phase: {phase}</p>
      <p>OCR ready: {String(ocrReady)}</p>
      <p>State: {recognitionResult?.state ?? '-'}</p>
      <p>Confidence: {confidencePercent}%</p>
      <p className="line-clamp-2 break-words">Matched: {recognitionResult?.matchedKeywords?.join(', ') || '-'}</p>
      <p className="line-clamp-3 break-words">
        OCR: {debugWords?.length ? debugWords.map((w) => w.text).join(' / ') : '-'}
      </p>
      <p>Analysis: {lastAnalysisMs}ms</p>
    </div>
  )
}
