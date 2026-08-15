/**
 * 개발(DEV) 환경 전용 디버그 패널. 브랜드 판별 점수(mega/momsTouch 둘 다), 화면 상태
 * 판별 결과, OCR 원문, 분석 소요 시간을 화면 한쪽에 작게 표시한다.
 * 운영 화면에는 표시되지 않는다(KioskCaptureScreen에서 import.meta.env.DEV로 분기) -
 * 요구사항 10장: "개발용 점수와 OCR 결과는 운영 화면에 노출하지 마세요."
 */
export function AROverlayDebugPanel({ phase, activeBrand, lastBrandResult, lastStateResult, debugWords, lastAnalysisMs, ocrReady }) {
  const megaPercent = Math.round((lastBrandResult?.scores?.mega ?? 0) * 100)
  const momsPercent = Math.round((lastBrandResult?.scores?.momsTouch ?? 0) * 100)
  const stateConfidencePercent = Math.round((lastStateResult?.confidence ?? 0) * 100)

  return (
    <div className="absolute top-2 left-2 z-40 max-w-[220px] rounded-lg bg-black/80 text-[10px] leading-tight text-lime-300 font-mono p-2 pointer-events-none select-none space-y-0.5">
      <p>Phase: {phase}</p>
      <p>OCR ready: {String(ocrReady)}</p>
      <p>Active brand: {activeBrand ?? '-'}</p>
      <p>
        Brand scores: MEGA {megaPercent}% / MOMS {momsPercent}%
      </p>
      <p className="line-clamp-2 break-words">Brand matched: {lastBrandResult?.matchedKeywords?.join(', ') || '-'}</p>
      <p>State: {lastStateResult?.state ?? '-'}</p>
      <p>State confidence: {stateConfidencePercent}%</p>
      <p className="line-clamp-2 break-words">State matched: {lastStateResult?.matchedKeywords?.join(', ') || '-'}</p>
      <p className="line-clamp-3 break-words">OCR: {debugWords?.length ? debugWords.map((w) => w.text).join(' / ') : '-'}</p>
      <p>Analysis: {lastAnalysisMs}ms</p>
    </div>
  )
}
