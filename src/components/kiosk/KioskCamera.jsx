/**
 * 촬영 기반 키오스크 플로우의 카메라 프리뷰.
 * 기존 useCamera 훅(후면 카메라 우선, 권한/에러 처리)을 그대로 재사용하고,
 * 여기서는 <video> 렌더링과 "카메라 켜는 중" 로딩 표시만 담당한다.
 */
export function KioskCamera({ videoRef, cameraStatus }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          cameraStatus === 'active' ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {cameraStatus === 'requesting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/80 gap-3 z-30">
          <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-bold">카메라를 켜는 중입니다...</p>
        </div>
      )}
    </div>
  )
}
