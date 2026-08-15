import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { settingsApi } from '../api/settingsApi'
import { AppFrame } from '../components/common/AppFrame'
import { BottomTabBar } from '../components/common/BottomTabBar'
import { Card } from '../components/common/Card'
import { ToggleSwitch } from '../components/common/ToggleSwitch'

// package.json의 "version"은 0.0.0(초기값)이라 사용자에게 보여줄 의미 있는 값이
// 아니다. 요구사항 문서에 나온 예시값("예: 1.0.0")을 그대로 표시용 상수로 쓴다 —
// 실제 배포 버전 관리 정책이 정해지면 이 상수를 그 값으로 바꾸면 된다.
const DISPLAY_VERSION = '1.0.0'

// 햄버거 메뉴("설정")에서 진입하는 설정 화면. 요구사항 문서 2번(설정 화면) 기준으로
// 3개 섹션(보호 및 안전 / 음성 및 알림 / 앱 정보)을 구성한다.
//
// 하단 탭바(홈/이용 상태/설정): 이 앱은 원래 햄버거+사이드패널 내비게이션만 쓰고
// 있었는데, 요구사항 문서가 이 화면 전용으로 하단 탭바를 명시적으로 요청했다.
// 앱 전체 내비게이션을 바꾸는 건 이번 작업 범위 밖이라(사용자 확인 완료) 새
// 컴포넌트(BottomTabBar.jsx)를 만들어 이 화면에서만 마운트했다.
//
// 데이터: "보호자 모니터링"/"허용 앱·사이트 관리" row는 설명 텍스트 + 이동 버튼일
// 뿐이라 별도 API가 필요 없다. "음성 안내/민감 행동 확인 알림/광고 시청 알림" 3개
// 토글은 API 명세서에 없는 기능이라 settingsApi.js의 mock으로 조회/저장한다
// (사용자 확인: 명세서에 없는 기능은 mock으로 우선 구현).
export function SettingsScreen() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    let cancelled = false
    settingsApi.getSettings().then((data) => {
      if (!cancelled) setSettings(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // 토글은 눌렀을 때 바로 화면에 반영(낙관적 업데이트)하고, mock 저장 API를
  // 뒤따라 호출한다. 실제 백엔드가 정해지면 실패 시 롤백 처리를 추가해야 한다
  // (notificationApi.js 화면과 동일한 패턴).
  const handleToggle = (key) => (nextValue) => {
    setSettings((prev) => ({ ...prev, [key]: nextValue }))
    settingsApi.updateSetting(key, nextValue)
  }

  return (
    <AppFrame>
      <main
        className="relative flex h-full flex-col overflow-y-auto"
        style={{ background: 'var(--color-bg)' }}
      >
        {/* 하단 탭바(64px)에 콘텐츠가 가리지 않도록, 스크롤 영역 자체에 여유
            패딩을 준다 — 다른 화면들의 px-6 py-16 관례에 맞추되 아래쪽만 늘림. */}
        <div className="flex flex-col gap-6 px-6 pb-24 pt-16">
          <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-text)' }}>
            설정
          </h1>

          <SettingsSection title="보호 및 안전">
            <Card className="flex flex-col">
              <SettingsRow
                label="보호자 모니터링"
                description="보호자가 이용 현황을 확인할 수 있어요."
                action={{ label: '보기', onClick: () => navigate('/settings/guardian-monitoring') }}
              />
              <RowDivider />
              <SettingsRow
                label="허용 앱·사이트 관리"
                description="연결을 허용한 앱과 사이트를 관리해요."
                action={{ label: '편집', onClick: () => navigate('/settings/allowed-apps') }}
              />
            </Card>
          </SettingsSection>

          <SettingsSection title="음성 및 알림">
            <Card className="flex flex-col">
              <SettingsRow
                label="음성 안내"
                toggle={
                  settings && (
                    <ToggleSwitch
                      checked={settings.voiceGuidance}
                      onChange={handleToggle('voiceGuidance')}
                      ariaLabel="음성 안내 켜기/끄기"
                    />
                  )
                }
              />
              <RowDivider />
              <SettingsRow
                label="민감 행동 확인 알림"
                toggle={
                  settings && (
                    <ToggleSwitch
                      checked={settings.sensitiveActionAlert}
                      onChange={handleToggle('sensitiveActionAlert')}
                      ariaLabel="민감 행동 확인 알림 켜기/끄기"
                    />
                  )
                }
              />
              <RowDivider />
              <SettingsRow
                label="광고 시청 알림"
                toggle={
                  settings && (
                    <ToggleSwitch
                      checked={settings.adViewAlert}
                      onChange={handleToggle('adViewAlert')}
                      ariaLabel="광고 시청 알림 켜기/끄기"
                    />
                  )
                }
              />
            </Card>
          </SettingsSection>

          <SettingsSection title="앱 정보">
            <Card className="flex flex-col">
              <SettingsRow label="버전" value={DISPLAY_VERSION} />
              <RowDivider />
              <SettingsRow
                label="개인정보 처리방침"
                action={{ label: '보기', onClick: () => navigate('/settings/privacy-policy') }}
              />
            </Card>
          </SettingsSection>
        </div>

        <BottomTabBar />
      </main>
    </AppFrame>
  )
}

// 섹션 제목 + 카드 한 벌을 묶는 얇은 래퍼. 반복되는 "제목 스타일 + 간격"을
// 여기 한 곳에서만 관리한다.
function SettingsSection({ title, children }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 style={{ fontSize: 'var(--text-body)', fontWeight: 700, color: 'var(--color-gray)' }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

// 카드 안의 한 줄. value(정적 텍스트) / toggle(스위치) / action(버튼) 중 화면마다
// 필요한 것만 넘겨 쓴다 — 셋 다 동시에 쓰는 row는 없어서 분기 없이 나란히 옵셔널로 뒀다.
function SettingsRow({ label, description, value, toggle, action }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      {/* min-w-0 없이는 flex row가 이 라벨/설명 블록을 줄이지 못해, 옆의
          action 버튼이 대신 찌그러지면서 "보기"/"편집" 글자가 세로로
          쪼개져 보이는 버그가 있었다 — 버튼 쪽에 flex-shrink-0을 주는 것만으로는
          부족하고, 늘어나는 쪽(라벨)이 줄어들 수 있다고 명시해야 해결된다. */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span style={{ fontSize: 'var(--text-body-lg)', fontWeight: 500, color: 'var(--color-text)' }}>
          {label}
        </span>
        {description && (
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-gray)' }}>
            {description}
          </span>
        )}
      </div>

      {value && (
        <span style={{ fontSize: 'var(--text-body)', color: 'var(--color-gray)' }}>{value}</span>
      )}
      {toggle}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="quick-action-button flex-shrink-0 whitespace-nowrap"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

// row 사이 옅은 구분선 — SidePanel.jsx 히스토리 목록과 같은 방식(색만 재사용,
// 새 CSS 클래스를 만들지 않음).
function RowDivider() {
  return <div style={{ borderTop: '1px solid var(--color-gray-light)' }} />
}
