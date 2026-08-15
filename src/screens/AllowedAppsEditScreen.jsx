import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { allowedAppsApi } from '../api/allowedAppsApi'
import { AppFrame } from '../components/common/AppFrame'
import { PrimaryButton } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { ChevronLeftIcon } from '../components/common/icons'
import { ToggleSwitch } from '../components/common/ToggleSwitch'

// 설정 화면 "허용 앱·사이트 관리 > 편집"에서 진입하는 상세 화면. API 명세서
// v2.0에는 이 기능(연결 허용 앱 목록/토글) 자체가 없어(allowedAppsApi.js 주석
// 참고), 6개 앱을 전부 "연결됨"으로 고정한 mock 데이터로 화면만 완성한다.
//
// 저장 방식: 다른 설정 토글(SettingsScreen, NotificationSettingsScreen)은 누르는
// 즉시 저장되는 낙관적 업데이트 방식인데, 이 화면은 요구사항 문서가 하단에 별도
// "변경사항 저장" 버튼을 명시하고 있어 다르게 구현했다 — 토글은 이 화면의 로컬
// state만 바꾸고, "변경사항 저장"을 눌러야 실제로 allowedAppsApi에 반영된다.
export function AllowedAppsEditScreen() {
  const navigate = useNavigate()
  const [apps, setApps] = useState([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [saveStatus, setSaveStatus] = useState('idle') // idle | saving | saved

  useEffect(() => {
    let cancelled = false
    allowedAppsApi.getAllowedApps().then((data) => {
      if (!cancelled) {
        setApps(data)
        setIsLoaded(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  // 토글은 화면(로컬 state)만 바꾼다 — 실제 저장은 handleSave에서 한 번에 처리한다.
  const handleToggle = (id) => (nextConnected) => {
    setApps((prev) => prev.map((app) => (app.id === id ? { ...app, connected: nextConnected } : app)))
    setSaveStatus('idle')
  }

  const handleSave = async () => {
    setSaveStatus('saving')
    // mock API가 배열 단위 upsert를 지원하지 않아, 바뀐 앱들을 순서대로 저장한다.
    // (allowedAppsApi.js 주석 참고 — 실제 백엔드가 정해지면 한 번에 보내는 방식으로
    // 바꿀 수 있다.)
    for (const app of apps) {
      await allowedAppsApi.updateAllowedApp(app.id, app.connected)
    }
    setSaveStatus('saved')
  }

  return (
    <AppFrame>
      <main
        className="flex h-full flex-col overflow-y-auto"
        style={{ background: 'var(--color-bg)' }}
      >
        <div className="flex flex-col gap-4 px-6 pb-10 pt-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="뒤로 가기"
              className="flex items-center justify-center"
              style={{ width: 44, height: 44, color: 'var(--color-text)' }}
            >
              <ChevronLeftIcon />
            </button>
            <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-text)' }}>
              허용 앱 편집
            </h1>
          </div>

          <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-gray)' }}>
            아래 앱들은 이 앱과 연결할 수 있어요. 사용하지 않을 앱은 꺼 두세요.
          </p>

          {!isLoaded && (
            <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-gray)' }}>불러오는 중...</p>
          )}

          <Card className="flex flex-col">
            {apps.map((app, index) => (
              <div key={app.id}>
                {index > 0 && <div style={{ borderTop: '1px solid var(--color-gray-light)' }} />}
                <div className="flex items-center justify-between gap-3 py-3">
                  <div className="flex flex-col gap-1">
                    <span
                      style={{ fontSize: 'var(--text-body-lg)', fontWeight: 500, color: 'var(--color-text)' }}
                    >
                      {app.name}
                    </span>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-gray)' }}>
                      {app.description}
                    </span>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-gray)' }}>
                      {app.name} 연결
                    </span>
                    <ToggleSwitch
                      checked={app.connected}
                      onChange={handleToggle(app.id)}
                      ariaLabel={`${app.name} 연결 켜기/끄기`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </Card>

          <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-gray)' }}>
            연결을 끄면 해당 앱으로 바로 이동하지 않아요.
          </p>

          <PrimaryButton onClick={handleSave} disabled={!isLoaded || saveStatus === 'saving'} className="w-full">
            {saveStatus === 'saving' ? '저장 중...' : '변경사항 저장'}
          </PrimaryButton>

          {saveStatus === 'saved' && (
            <p
              className="text-center"
              style={{ fontSize: 'var(--text-body)', color: 'var(--color-primary)' }}
            >
              변경사항이 저장됐어요.
            </p>
          )}
        </div>
      </main>
    </AppFrame>
  )
}
