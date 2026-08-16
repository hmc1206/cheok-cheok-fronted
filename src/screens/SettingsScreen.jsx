import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationApi } from '../api/notificationApi'
import { settingsApi } from '../api/settingsApi'
import { AppFrame } from '../components/common/AppFrame'
import { MobileHeader } from '../components/common/MobileHeader'
import { SeniorButton } from '../components/ui/SeniorButton'
import { ToggleSwitch } from '../components/common/ToggleSwitch'
import { useHistoryStore } from '../store/historyStore'

// 홈 화면 헤더의 설정 아이콘에서 진입하는 설정 화면(HomeScreen.jsx 참고). 요구사항
// 문서 2번(설정 화면) 기준 2개 섹션(보호 및 안전 / 음성 및 알림)을 B안(feat/senior-
// ui-refactor) 톤 — MobileHeader/SeniorButton/var(--cb-*) 토큰 — 으로 새로 짰다.
// "앱 정보" 섹션(버전, 개인정보 처리방침)은 이전 라운드 피드백으로 이미 삭제하기로
// 확정된 상태라 처음부터 만들지 않았고, 하단 탭바도 마찬가지로 만들지 않았다
// (둘 다 사용자 확인을 거쳐 확정된 결정 — 뒤로가기 버튼 하나로 충분).
//
// "전체 알림" 토글: 원래 별도 화면(NotificationSettingsScreen, /notification-
// settings)에 있던 유일한 토글인데, 그 화면이 B안으로 이관되지 않아 스타일이
// 깨져 있었다(옛 --text-title 등 존재하지 않는 토큰 참조). 화면을 따로 고치는
// 대신, 이전에 이미 확정했던 대로 이 화면의 "음성 및 알림" 섹션 네 번째 항목으로
// 통합하고 옛 화면/라우트는 삭제했다(App.jsx 참고) — 데이터 소스(notificationApi.js)
// 는 그대로 재사용해 저장 로직이 손실되지 않았다.
//
// "도움 기록": 원래 홈 화면 헤더 버튼 + SidePanel 드로어로 봤는데(요청사항:
// "도움기록 기능을 설정 안으로 넣고") 이 화면의 한 섹션으로 옮겼다. 홈 화면
// (HomeScreen.jsx)과 이 화면이 서로 다른 라우트(별개 컴포넌트 트리)라 로컬
// state로는 기록을 공유할 수 없어서, historyStore.js(Zustand)로 빼서 홈에서
// 쌓고 여기서 읽는다. ChatScreen.jsx가 여전히 SidePanel을 별도로 쓰고 있어
// SidePanel.jsx 자체는 삭제하지 않았다(거긴 손대지 않음, 이번 요청 범위 밖).
export function SettingsScreen() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(null)
  const [notificationEnabled, setNotificationEnabled] = useState(null)
  const history = useHistoryStore((state) => state.history)

  useEffect(() => {
    let cancelled = false
    settingsApi.getSettings().then((data) => {
      if (!cancelled) setSettings(data)
    })
    notificationApi.getSettings().then((data) => {
      if (!cancelled) setNotificationEnabled(data.enabled)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleToggle = (key) => (nextValue) => {
    setSettings((prev) => ({ ...prev, [key]: nextValue }))
    settingsApi.updateSetting(key, nextValue)
  }

  const handleToggleNotification = (nextEnabled) => {
    setNotificationEnabled(nextEnabled)
    notificationApi.updateSettings({ enabled: nextEnabled })
  }

  return (
    <AppFrame>
      <main className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--cb-cream)]">
        <MobileHeader title="설정" onBack={() => navigate(-1)} />

        <div className="flex-1 overflow-y-auto px-5 py-6">
          {/* "월 구독 신청" 진입 배너. 홈 화면 헤더(HomeScreen.jsx)에 아이콘을
              하나 더 넣는 대신, 설정 화면 맨 위 배너로 뒀다 — 홈에서 2탭이면
              닿는다(HomeScreen.jsx SettingsIcon 버튼 주석 참고). */}
          <button
            type="button"
            onClick={() => navigate('/subscription')}
            className="mb-5 flex w-full items-center justify-between rounded-2xl p-4 text-left"
            style={{ background: 'var(--cb-navy)' }}
          >
            <span>
              <span className="block text-[13px] font-bold text-white/70">더 편하게 이용하고 싶다면</span>
              <span className="mt-1 block text-[17px] font-extrabold text-white">월 구독 신청하기</span>
            </span>
            <span aria-hidden="true" className="text-[22px] text-white">
              ›
            </span>
          </button>

          <SettingsSection title="도움 기록">
            <HistoryList history={history} />
          </SettingsSection>

          <SettingsSection title="보호 및 안전">
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
          </SettingsSection>

          <SettingsSection title="음성 및 알림">
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
            <RowDivider />
            <SettingsRow
              label="전체 알림"
              toggle={
                notificationEnabled !== null && (
                  <ToggleSwitch
                    checked={notificationEnabled}
                    onChange={handleToggleNotification}
                    ariaLabel="전체 알림 켜기/끄기"
                  />
                )
              }
            />
          </SettingsSection>
        </div>
      </main>
    </AppFrame>
  )
}

function SettingsSection({ title, children }) {
  return (
    <section className="mb-6">
      <h2
        className="mb-2 text-[13px] font-extrabold tracking-[0.1em] text-[var(--cb-slate)]"
        style={{ textTransform: 'uppercase' }}
      >
        {title}
      </h2>
      <div className="rounded-2xl border" style={{ borderColor: 'var(--cb-line)' }}>
        {children}
      </div>
    </section>
  )
}

// value(정적 텍스트) / toggle(스위치) / action(버튼) 중 화면마다 필요한 것만
// 넘겨 쓴다. min-w-0 없이는 flex row가 라벨/설명 블록을 줄이지 못해 action
// 버튼이 대신 찌그러지는 문제가 있어(이전 라운드에서 발견/수정한 버그) 그대로
// 이어받았다.
function SettingsRow({ label, description, value, toggle, action }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[17px] font-bold tracking-[-0.03em] text-[var(--cb-navy)]">{label}</span>
        {description && (
          <span className="text-[14px] font-medium text-[var(--cb-slate)]">{description}</span>
        )}
      </div>

      {value && <span className="text-[15px] font-semibold text-[var(--cb-slate)]">{value}</span>}
      {toggle}
      {action && (
        // SeniorButton 기본 글자 크기(18px)가 이 좁은 row 버튼("보기"/"편집")엔
        // 너무 커 보인다는 이전 라운드 피드백을 그대로 반영해 15px로 줄였다 —
        // Tailwind 유틸리티는 소스 순서가 아니라 생성 순서로 우선순위가 정해져서
        // className을 뒤에 붙이는 것만으로는 SeniorButton 내부의 text-[18px]를
        // 못 이길 수 있어 !important(!text-[15px])로 명시적으로 덮어썼다. 터치
        // 영역(min-h-14, 56px)은 접근성 때문에 그대로 유지 — 글자만 줄이고
        // 버튼 자체 크기는 건드리지 않는다(이전 라운드에서 확정된 방식).
        <SeniorButton
          type="button"
          onClick={action.onClick}
          variant="secondary"
          fullWidth={false}
          className="shrink-0 whitespace-nowrap px-4 !text-[15px]"
        >
          {action.label}
        </SeniorButton>
      )}
    </div>
  )
}

function RowDivider() {
  return <div className="border-t" style={{ borderColor: 'var(--cb-line)' }} />
}

// SidePanel.jsx가 예전에 하던 렌더링(최신순 정렬, 시간+질문+답변)을 그대로
// 옮겨왔다 — 데이터 소스만 로컬 props에서 historyStore로 바뀌었을 뿐 표시
// 방식은 동일하다.
function HistoryList({ history }) {
  if (history.length === 0) {
    return (
      <p className="px-4 py-4 text-[14px] font-medium text-[var(--cb-slate)]">
        아직 대화 기록이 없어요.
      </p>
    )
  }

  return (
    <ul>
      {[...history].reverse().map((entry, index) => (
        <li key={entry.id}>
          {index > 0 && <div className="border-t" style={{ borderColor: 'var(--cb-line)' }} />}
          <div className="flex flex-col gap-1 px-4 py-4">
            <time className="text-[12px] font-medium text-[var(--cb-slate)]">
              {formatTimestamp(entry.createdAt ?? entry.id)}
            </time>
            <p className="text-[16px] font-bold leading-6 tracking-[-0.03em] text-[var(--cb-navy)]">
              {entry.question || '음성 질문을 확인하고 있어요.'}
            </p>
            <p className="text-[14px] font-medium leading-5 text-[var(--cb-slate)]">{entry.answer}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function formatTimestamp(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '방금 전'
  return new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' }).format(date)
}
