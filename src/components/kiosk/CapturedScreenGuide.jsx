import { AROverlay } from './AROverlay'

/**
 * "촬영 후 안내 화면"의 상단 영역(요구사항 2장, 화면의 약 70~75%).
 * 촬영한 키오스크 화면(정지 이미지)을 object-fit: contain으로 보여주고,
 * 그 위에 AROverlay로 강조 영역을 그린다. 분석 중에는 로딩 오버레이를,
 * 우측 상단에는 "다시 촬영" / "화면 직접 선택" 보조 버튼을 둔다.
 */
export function CapturedScreenGuide({ capturedImage, targets, phase, isAnalyzing, onRetake, onOpenStateSelector }) {
  return (
    <div className="relative w-full h-full bg-black">
      <AROverlay
        imageUrl={capturedImage?.dataUrl}
        naturalWidth={capturedImage?.width}
        naturalHeight={capturedImage?.height}
        // 분석 중/인식 실패 상태에서는 아직 확정되지 않은 안내이므로 AR 박스를 띄우지 않는다
        // (요구사항: 잘못된 위치에 AR을 띄우지 않기).
        targets={phase === 'guiding' ? targets : []}
      />

      {isAnalyzing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-3 z-20">
          <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-white text-base font-bold">화면을 확인하고 있어요...</p>
        </div>
      )}

      <div className="absolute top-3 right-3 flex flex-col gap-2 z-20">
        <button
          type="button"
          onClick={onRetake}
          className="min-h-[44px] px-4 bg-black/70 text-white text-sm font-bold rounded-xl border border-white/30 focus-visible:outline-3 focus-visible:outline-white"
        >
          다시 촬영
        </button>
        <button
          type="button"
          onClick={onOpenStateSelector}
          className="min-h-[44px] px-4 bg-black/70 text-white text-sm font-bold rounded-xl border border-white/30 focus-visible:outline-3 focus-visible:outline-white"
        >
          화면 직접 선택
        </button>
      </div>
    </div>
  )
}
