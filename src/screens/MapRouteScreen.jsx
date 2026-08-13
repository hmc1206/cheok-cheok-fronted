import { useCallback, useState } from 'react'
import { routesApi } from '../api/routesApi'
import { AppFrame } from '../components/common/AppFrame'
import { useTTS } from '../hooks/useTTS'
import { openNaverMapWithWebFallback } from '../lib/naverMapDeepLink'

// 길찾기 화면. 기존엔 음성 대화(/voice/process)로 목적지를 말하면 우리 앱 안에
// 네이버 지도 SDK를 그대로 그리는 방식이었지만, 백엔드가 좌표 변환+딥링크 조립을
// 전담하는 새 방식으로 완전히 대체됐다: 출발지/목적지 텍스트만 보내면 백엔드가
// 완성된 네이버 지도 앱/웹 URL을 돌려주고, 프론트는 그 URL을 실행만 한다.
export function MapRouteScreen() {
  const { speak } = useTTS()
  const [startName, setStartName] = useState('')
  const [goalName, setGoalName] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | error
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault()
      if (!startName.trim() || !goalName.trim()) return

      setStatus('loading')
      setErrorMessage('')
      try {
        const { naverMapAppUrl, naverMapWebUrl } = await routesApi.getNaverMapLink({
          startName: startName.trim(),
          goalName: goalName.trim(),
        })
        // 어르신 UX: 앱으로 넘어가기 직전, 무슨 일이 일어나는지 음성으로도 안내한다
        // (다른 화면들의 "청각+시각 이중 안내" 원칙과 동일).
        speak(`${startName}에서 ${goalName}까지 경로를 네이버 지도에서 열어드릴게요.`)
        openNaverMapWithWebFallback(naverMapAppUrl, naverMapWebUrl)
        setStatus('idle')
      } catch (error) {
        console.error('[길찾기] 링크 생성 실패:', error)
        // 공통 에러 포맷({ errorCode, message, ttsText })을 그대로 활용하되,
        // ttsText가 없을 수도 있어 message로도 한 번 더 대비한다.
        const message =
          error.response?.data?.ttsText ??
          error.response?.data?.message ??
          '경로를 찾는 데 실패했어요. 다시 시도해주세요.'
        setErrorMessage(message)
        speak(message)
        setStatus('error')
      }
    },
    [startName, goalName, speak],
  )

  return (
    <AppFrame>
      <main className="flex h-full flex-col gap-4 p-6">
        <h1 style={{ fontSize: 'var(--font-size-xl)' }}>길 찾기</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          출발지와 목적지를 입력하면 네이버 지도에서 대중교통 경로를 열어드려요.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span style={{ fontSize: 'var(--font-size-base)' }}>출발지</span>
            <input
              value={startName}
              onChange={(event) => setStartName(event.target.value)}
              placeholder="예: 수원역"
              className="border p-2"
              style={{
                fontSize: 'var(--font-size-base)',
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--radius-base)',
              }}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span style={{ fontSize: 'var(--font-size-base)' }}>목적지</span>
            <input
              value={goalName}
              onChange={(event) => setGoalName(event.target.value)}
              placeholder="예: 부산역"
              className="border p-2"
              style={{
                fontSize: 'var(--font-size-base)',
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--radius-base)',
              }}
            />
          </label>

          <button type="submit" className="quick-action-button" disabled={status === 'loading'}>
            {status === 'loading' ? '경로 찾는 중...' : '길찾기'}
          </button>
        </form>

        {status === 'error' && <p style={{ color: 'var(--color-danger)' }}>{errorMessage}</p>}
      </main>
    </AppFrame>
  )
}
