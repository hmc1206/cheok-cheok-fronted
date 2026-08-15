import { useLayoutEffect, useRef, useState } from 'react'

/**
 * 촬영된 "정지 이미지" 위에 퍼센트 기준 AR 강조 영역을 그리는 컴포넌트.
 *
 * 기존 KioskAROverlay.jsx는 "실시간 video, object-fit:cover, 중심좌표 단일 타겟" 전용으로
 * 설계돼 있어 그대로 재사용할 수 없다. 이 컴포넌트는 "정지 이미지, object-fit:contain,
 * top-left 좌표 다중 타겟"에 맞춰 새로 만들었다. 기존 KioskAROverlay.jsx는 실시간 엔진
 * (맘스터치 등)이 계속 쓰므로 이름을 다르게 지어 건드리지 않는다.
 *
 * object-fit: contain은 이미지 비율에 따라 컨테이너 안에서 레터박스(여백)가 생길 수 있어
 * 단순히 x/y 퍼센트를 컨테이너 크기에 곱하면 위치가 어긋난다. 그래서 실제로 렌더링된
 * 이미지 영역(scale, offset)을 직접 계산한다 - services/coordinateMapper.js의 "cover"용
 * 변환과 원리는 같지만 "contain"이라 별도로 구현했다(그 파일은 실시간 video 좌표계
 * 전용이라 여기서는 재사용하지 않는다).
 */
export function AROverlay({ imageUrl, naturalWidth, naturalHeight, targets = [] }) {
  const containerRef = useRef(null)
  // {scale, offsetX, offsetY} - contain 기준 실제 렌더링 영역 정보. 측정 전에는 null.
  const [transform, setTransform] = useState(null)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || !naturalWidth || !naturalHeight) return undefined

    const updateTransform = () => {
      const { clientWidth, clientHeight } = container
      if (!clientWidth || !clientHeight) return

      // object-fit: contain은 "긴 변에 맞춰 축소"하므로 더 작은 쪽 scale을 쓴다(cover와 반대).
      const scale = Math.min(clientWidth / naturalWidth, clientHeight / naturalHeight)
      const renderedWidth = naturalWidth * scale
      const renderedHeight = naturalHeight * scale

      setTransform({
        scale,
        offsetX: (clientWidth - renderedWidth) / 2,
        offsetY: (clientHeight - renderedHeight) / 2,
      })
    }

    updateTransform()

    // 화면 회전/리사이즈 시에도 강조 영역 위치가 어긋나지 않도록 컨테이너 크기 변화를 감시한다.
    const resizeObserver = new ResizeObserver(updateTransform)
    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [naturalWidth, naturalHeight])

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {imageUrl && (
        <img
          src={imageUrl}
          alt="촬영한 키오스크 화면"
          className="w-full h-full object-contain select-none pointer-events-none"
          draggable={false}
        />
      )}

      {transform &&
        targets.map((target, index) => {
          const left = transform.offsetX + (target.x / 100) * naturalWidth * transform.scale
          const top = transform.offsetY + (target.y / 100) * naturalHeight * transform.scale
          const width = (target.width / 100) * naturalWidth * transform.scale
          const height = (target.height / 100) * naturalHeight * transform.scale

          const isPrimary = (target.emphasis ?? 'primary') === 'primary'
          // 강조 영역이 이미지 아래쪽에 있으면 말풍선이 화면 밖으로 나가지 않도록 위쪽에 띄운다.
          const labelAbove = target.y > 55

          return (
            <div
              key={`${target.label}-${index}`}
              className={`absolute rounded-2xl pointer-events-none animate-ar-pulse ${
                isPrimary ? 'border-4 border-yellow-400 bg-yellow-400/20' : 'border-2 border-yellow-300/70 bg-yellow-300/10'
              }`}
              style={{ left, top, width, height }}
              aria-label={target.label}
            >
              {/* 손가락으로 누르는 방향을 가리키는 화살표(펄스 반복, prefers-reduced-motion 대응은
                  index.css의 animate-ar-bounce/animate-ar-pulse 정의에서 공통 처리된다). */}
              <div
                className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center animate-ar-bounce ${
                  labelAbove ? 'bottom-full mb-1' : 'top-full mt-1'
                }`}
              >
                {labelAbove ? (
                  <svg className="w-6 h-6 text-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 4l-8 8h6v8h4v-8h6z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 20l8-8h-6V4h-4v8H6z" />
                  </svg>
                )}
              </div>

              {/* 라벨 말풍선 - 손가락 아이콘 + 짧은 안내 문구 */}
              <div
                className={`absolute left-1/2 -translate-x-1/2 w-max max-w-[220px] px-3 py-2 rounded-xl shadow-2xl text-center pointer-events-none ${
                  labelAbove ? 'bottom-full mb-8' : 'top-full mt-8'
                } ${isPrimary ? 'bg-neutral-900/95 border-2 border-yellow-400' : 'bg-neutral-900/80 border border-yellow-300/60'}`}
              >
                <p className={`font-extrabold text-sm leading-tight ${isPrimary ? 'text-yellow-300' : 'text-yellow-200/90'}`}>
                  <span aria-hidden="true">👆 </span>
                  {target.label}
                </p>
              </div>
            </div>
          )
        })}
    </div>
  )
}
