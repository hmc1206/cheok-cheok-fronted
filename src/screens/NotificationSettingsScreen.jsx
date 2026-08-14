import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationApi } from '../api/notificationApi'
import { AppFrame } from '../components/common/AppFrame'
import { Card } from '../components/common/Card'
import { ToggleSwitch } from '../components/common/ToggleSwitch'

// 홈 화면 햄버거 메뉴의 "알람 설정"에서 진입하는 알림 설정 화면.
// API 명세서 v2.0(통합본)에 알림 설정 조회/저장 엔드포인트나 카테고리 목록이 정의돼
// 있지 않아(notificationApi.js 주석 참고), 요구사항의 "최소 조건"인 전체 알림
// on/off 토글만 구현한다 — 카테고리별 토글은 명세서에 카테고리 자체가 없어 만들지
// 않았다(추측해서 임의로 만들지 말라는 요청사항 반영).
export function NotificationSettingsScreen() {
  const navigate = useNavigate()
  const [enabled, setEnabled] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    notificationApi.getSettings().then((settings) => {
      if (!cancelled) {
        setEnabled(settings.enabled)
        setIsLoaded(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  // 토글 클릭 시 즉시 화면에 반영(낙관적 업데이트)하고, mock 저장 API를 호출한다.
  // 실제 백엔드가 정해지면 실패 시 롤백하는 에러 처리를 여기에 추가해야 한다.
  const handleToggle = (nextEnabled) => {
    setEnabled(nextEnabled)
    notificationApi.updateSettings({ enabled: nextEnabled })
  }

  return (
    <AppFrame>
      <main
        className="flex h-full flex-col gap-4 px-6 py-16"
        style={{ background: 'var(--color-bg)' }}
      >
        <div className="flex items-center gap-3">
          {/* 56px 최소 터치 영역 — 다른 화면 아이콘 버튼과 동일한 접근성 기준. */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="뒤로 가기"
            className="flex items-center justify-center"
            style={{ width: 56, height: 56, fontSize: 'var(--text-title)', color: 'var(--color-text)' }}
          >
            ←
          </button>
          <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-text)' }}>
            알림 설정
          </h1>
        </div>

        <Card className="flex items-center justify-between">
          <span style={{ fontSize: 'var(--text-body-lg)', fontWeight: 500, color: 'var(--color-text)' }}>
            전체 알림
          </span>
          <ToggleSwitch checked={enabled} onChange={handleToggle} ariaLabel="전체 알림 켜기/끄기" />
        </Card>

        {!isLoaded && (
          <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-gray)' }}>불러오는 중...</p>
        )}
      </main>
    </AppFrame>
  )
}
