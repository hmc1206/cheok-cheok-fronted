import { useNavigate, useLocation } from 'react-router-dom'
import { HomeTabIcon, SettingsTabIcon, UsageTabIcon } from './icons'

// 설정 화면군(설정/구독/허용앱편집 요구사항 문서의 "설정 화면" 하단 탭바) 전용
// 내비게이션. 이 앱의 나머지 화면들은 전부 햄버거+사이드패널 방식을 쓰고 있어서
// (SidePanel.jsx), 이건 그 방식과는 별개로 "설정 화면"에서만 쓰는 새 컴포넌트다 —
// 앱 전체 내비게이션을 하단 탭바로 바꾸는 것은 이번 작업 범위 밖이라 SettingsScreen
// 한 곳에서만 마운트한다.
//
// "이용 상태" 탭은 기존에 이미 만들어져 있던 /usage-limit 라우팅 스텁(UsageLimitScreen)
// 으로 보낸다 — 새 화면을 또 만들지 않고 기존 자리를 재사용.
const TABS = [
  { key: 'home', label: '홈', path: '/home', Icon: HomeTabIcon },
  { key: 'usage', label: '이용 상태', path: '/usage-limit', Icon: UsageTabIcon },
  { key: 'settings', label: '설정', path: '/settings', Icon: SettingsTabIcon },
]

export function BottomTabBar() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav
      className="absolute inset-x-0 bottom-0 z-10 flex"
      style={{ borderTop: '1px solid var(--color-gray-light)', background: 'var(--color-bg)' }}
      aria-label="주요 화면 이동"
    >
      {TABS.map(({ key, label, path, Icon }) => {
        // 현재 경로와 정확히 일치할 때만 활성 표시 — 이 탭바를 쓰는 화면이
        // /settings 하나뿐이라 startsWith 같은 하위 경로 매칭은 필요 없다.
        const isActive = location.pathname === path
        return (
          <button
            key={key}
            type="button"
            onClick={() => navigate(path)}
            aria-current={isActive ? 'page' : undefined}
            className="flex flex-1 flex-col items-center justify-center gap-1"
            style={{
              minHeight: 64,
              paddingTop: 'var(--space-xs)',
              paddingBottom: 'var(--space-xs)',
              color: isActive ? 'var(--color-primary)' : 'var(--color-gray)',
            }}
          >
            <Icon />
            <span style={{ fontSize: 'var(--text-caption)', fontWeight: isActive ? 700 : 400 }}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
