import { AROverlay } from './AROverlay'
import { KioskDirectionHint } from './KioskDirectionHint'

/**
 * "촬영 후 안내 화면"의 상단 영역(요구사항 2장, 화면의 약 70~75%).
 * 촬영한 키오스크 화면(정지 이미지)을 object-fit: contain으로 보여주고, 그 위에
 * AROverlay로 강조 영역을 그린다.
 *
 * 브랜드 자동판별 도입으로 두 가지가 추가됐다:
 * - currentStep.noTargetSearch가 true인 스텝(예: 맘스터치 "옵션 화면 스크롤",
 *   "카드 투입구 방향 안내")은 짚어줄 좌표가 없으므로 AR 박스 대신 기존 실시간
 *   엔진에서 쓰던 KioskDirectionHint를 그대로 재사용해 방향 안내만 표시한다
 *   (그 컴포넌트는 좌표 계산이 필요 없는 순수 프레젠테이션 컴포넌트라 브랜드/엔진에
 *   상관없이 그대로 가져다 쓸 수 있다 - 실시간 엔진 파일 자체는 수정하지 않았다).
 * - analyzingNode: 분석 중 오버레이를 화면(AnalysisProgress)에서 주입받는다 - 이전
 *   버전의 고정 스피너 문구 대신 "브랜드 확인 중 -> 화면 확인 중" 단계별 안내를 보여주기
 *   위해서다.
 */
export function CapturedScreenGuide({ capturedImage, currentStep, phase, analyzingNode, brandBadge, onRetake, onOpenStateSelector }) {
  const isGuiding = phase === 'guiding'
  const targets = isGuiding && currentStep && !currentStep.noTargetSearch ? currentStep.targets : []

  return (
    <div className="relative w-full h-full bg-black">
      <AROverlay imageUrl={capturedImage?.dataUrl} naturalWidth={capturedImage?.width} naturalHeight={capturedImage?.height} targets={targets} />

      {isGuiding && currentStep?.noTargetSearch && (
        <KioskDirectionHint title={currentStep.title} description={currentStep.instruction} direction={currentStep.directionHint ?? 'down'} />
      )}

      {brandBadge}

      {analyzingNode}

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
