import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { allowedAppsApi } from '../api/allowedAppsApi'
import { AppFrame } from '../components/common/AppFrame'
import { MobileHeader } from '../components/common/MobileHeader'
import { SeniorButton } from '../components/ui/SeniorButton'
import { ToggleSwitch } from '../components/common/ToggleSwitch'

// 설정 화면 "허용 앱·사이트 관리 > 편집"에서 진입하는 상세 화면. API 명세서
// v2.0에는 이 기능 자체가 없어(allowedAppsApi.js 주석 참고), 6개 앱을 전부
// "연결됨"으로 고정한 mock 데이터로 화면만 완성한다.
//
// 저장 방식: 설정 화면의 토글(SettingsScreen.jsx)은 누르는 즉시 저장되는 낙관적
// 업데이트 방식인데, 이 화면은 하단에 별도 "변경사항 저장" 버튼이 있어 다르게
// 구현했다 — 토글은 이 화면의 로컬 state만 바꾸고, "변경사항 저장"을 눌러야
// 실제로 allowedAppsApi에 반영된다(이전 라운드에서 확정된 방식, 그대로 이어받음).
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

  const handleToggle = (id) => (nextConnected) => {
    setApps((prev) => prev.map((app) => (app.id === id ? { ...app, connected: nextConnected } : app)))
    setSaveStatus('idle')
  }

  const handleSave = async () => {
    setSaveStatus('saving')
    for (const app of apps) {
      await allowedAppsApi.updateAllowedApp(app.id, app.connected)
    }
    setSaveStatus('saved')
  }

  return (
    <AppFrame>
      <main className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--cb-cream)]">
        <MobileHeader title="허용 앱 편집" onBack={() => navigate(-1)} />

        <div className="flex-1 overflow-y-auto px-5 pb-8 pt-4">
          <p className="text-[15px] font-medium leading-6 text-[var(--cb-slate)]">
            아래 앱들은 이 앱과 연결할 수 있어요. 사용하지 않을 앱은 꺼 두세요.
          </p>

          {!isLoaded && (
            <p className="mt-4 text-[14px] font-semibold text-[var(--cb-slate)]">불러오는 중...</p>
          )}

          <div className="mt-4 rounded-2xl border" style={{ borderColor: 'var(--cb-line)' }}>
            {apps.map((app, index) => (
              <div key={app.id}>
                {index > 0 && <div className="border-t" style={{ borderColor: 'var(--cb-line)' }} />}
                <div className="flex items-center justify-between gap-3 px-4 py-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-[17px] font-bold tracking-[-0.03em] text-[var(--cb-navy)]">
                      {app.name}
                    </span>
                    <span className="text-[13px] font-medium text-[var(--cb-slate)]">
                      {app.description}
                    </span>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[12px] font-semibold text-[var(--cb-slate)]">
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
          </div>

          <p className="mt-4 text-[13px] font-medium text-[var(--cb-slate)]">
            연결을 끄면 해당 앱으로 바로 이동하지 않아요.
          </p>

          <SeniorButton onClick={handleSave} disabled={!isLoaded || saveStatus === 'saving'} className="mt-5">
            {saveStatus === 'saving' ? '저장 중...' : '변경사항 저장'}
          </SeniorButton>

          {saveStatus === 'saved' && (
            <p className="mt-3 text-center text-[15px] font-bold text-[var(--cb-tomato)]">
              변경사항이 저장됐어요.
            </p>
          )}
        </div>
      </main>
    </AppFrame>
  )
}
