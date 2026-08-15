import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { subscriptionApi } from '../api/subscriptionApi'
import { usageApi } from '../api/usageApi'
import { AppFrame } from '../components/common/AppFrame'
import { PrimaryButton } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { CheckIcon, ChevronLeftIcon } from '../components/common/icons'

// 요구사항 문서에는 CTA 버튼 색이 "진한 남색/블랙 계열"로 적혀 있지만, 이 앱의
// 디자인 브리프는 "accent 컬러(--color-primary)는 단 하나만, 다른 색을 클릭 유도
// 신호로 쓰지 않는다"를 원칙으로 못박고 있다(tokens.css, Button.jsx 주석 참고).
// 새 남색 CTA를 추가하면 이 원칙이 깨지고 홈/로그인/길찾기 화면의 PrimaryButton과
// 도 톤이 어긋나므로, 기존 PrimaryButton(accent 채우기)을 그대로 재사용했다.
// 색상 자체를 남색으로 바꾸고 싶다면 별도로 알려달라고 요청함(작업 완료 보고 참고).

// 햄버거 메뉴 "월 구독 신청"에서 진입하는 구독 신청 화면. API 명세서 v2.0에 구독/
// 결제 엔드포인트가 전혀 없어(subscriptionApi.js 주석 참고), "신청하기" 버튼은
// 실제 결제를 일으키지 않는 mock이다 — 실제 결제 연동은 백엔드 확정 후 진행해야 한다.
export function SubscriptionScreen() {
  const navigate = useNavigate()
  const [remainingFreeUsage, setRemainingFreeUsage] = useState(null)
  const [subscribeStatus, setSubscribeStatus] = useState('idle') // idle | loading | done

  // "현재 이용 상태" 카드 — 홈 화면과 동일하게 usageApi.js(mock)에서 가져온다.
  // 두 화면이 같은 데이터 소스를 쓰므로 숫자가 서로 어긋나지 않는다.
  useEffect(() => {
    let cancelled = false
    usageApi.getUsageStatus().then((data) => {
      if (!cancelled) setRemainingFreeUsage(data.remainingFreeUsage)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubscribe = async () => {
    setSubscribeStatus('loading')
    await subscriptionApi.subscribe()
    setSubscribeStatus('done')
  }

  return (
    <AppFrame>
      <main
        className="flex h-full flex-col overflow-y-auto"
        style={{ background: 'var(--color-bg)' }}
      >
        <div className="flex flex-col gap-6 px-6 pb-10 pt-6">
          {/* 후속 요청: "구독 신청 화면" 타이틀 텍스트를 없애고, 뒤로가기 버튼
              바로 아래에 "월 구독 신청" 소제목이 오도록 구조를 바꿨다 — 뒤로가기
              버튼만 남기고(다른 화면들과 같은 44px 아이콘 버튼), 원래 타이틀
              자리에 있던 h1을 삭제했다. 그 아래 섹션(h2 "월 구독 신청")은
              DOM 순서상 원래도 바로 다음 형제였어서 위치 이동 없이 자연스럽게
              최상단으로 올라온다. */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="뒤로 가기"
            className="flex items-center justify-center"
            style={{ width: 44, height: 44, color: 'var(--color-text)' }}
          >
            <ChevronLeftIcon />
          </button>

          <section className="flex flex-col gap-1">
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, color: 'var(--color-text)' }}>
              월 구독 신청
            </h2>
            <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-gray)' }}>
              매달 자동으로 결제되는 정기 구독으로, 무료 이용 횟수 제한 없이 척척의 모든 기능을
              이용하실 수 있어요.
            </p>
          </section>

          <Card className="flex flex-col gap-3">
            <h3 style={{ fontSize: 'var(--text-body-lg)', fontWeight: 600, color: 'var(--color-text)' }}>
              구독 혜택
            </h3>
            <ul className="flex flex-col gap-2">
              {['무제한 이용', '광고 없이 사용', 'KTX 예매·키오스크·앱 연결 모두 사용 가능'].map(
                (benefit) => (
                  <li key={benefit} className="flex items-center gap-2">
                    <span style={{ color: 'var(--color-primary)', flexShrink: 0 }}>
                      <CheckIcon size={18} />
                    </span>
                    <span style={{ fontSize: 'var(--text-body)', color: 'var(--color-text)' }}>
                      {benefit}
                    </span>
                  </li>
                ),
              )}
            </ul>
          </Card>

          <Card className="flex flex-col gap-1">
            <h3 style={{ fontSize: 'var(--text-body-lg)', fontWeight: 600, color: 'var(--color-text)' }}>
              구독 요금
            </h3>
            <p style={{ fontSize: 'var(--text-heading)', fontWeight: 700, color: 'var(--color-primary)' }}>
              월 3,900원
            </p>
            <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-gray)' }}>
              자동 결제되며, 언제든 해지할 수 있어요.
            </p>
          </Card>

          {/* HomeScreen.jsx의 "현재 이용 상태" 카드와 완전히 같은 문구/데이터 소스를
              써서 두 화면에서 보이는 값이 서로 다르지 않게 했다. */}
          <Card className="usage-status-card flex flex-col gap-1">
            <h3 style={{ fontSize: 'var(--text-body-lg)', fontWeight: 600, color: 'var(--color-text)' }}>
              현재 이용 상태
            </h3>
            <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text)' }}>
              {remainingFreeUsage === null
                ? '확인 중...'
                : `이번 달 무료 이용 ${remainingFreeUsage}회 남았어요`}
            </p>
          </Card>

          <section className="flex flex-col gap-2">
            <h3 style={{ fontSize: 'var(--text-body-lg)', fontWeight: 600, color: 'var(--color-text)' }}>
              신청 전 꼭 확인해 주세요
            </h3>
            <ul className="flex flex-col gap-1" style={{ paddingLeft: 'var(--space-sm)' }}>
              {[
                '신청하면 지금 바로 구독이 시작돼요.',
                '첫 결제는 오늘 진행돼요.',
                '해지하면 다음 달부터 요금이 청구되지 않아요.',
              ].map((notice) => (
                <li
                  key={notice}
                  style={{ fontSize: 'var(--text-body)', color: 'var(--color-gray)', listStyle: 'disc' }}
                >
                  {notice}
                </li>
              ))}
            </ul>
          </section>

          <PrimaryButton onClick={handleSubscribe} disabled={subscribeStatus !== 'idle'} className="w-full">
            {subscribeStatus === 'loading' ? '신청 처리 중...' : '월 구독 신청하기'}
          </PrimaryButton>

          {subscribeStatus === 'done' && (
            <p
              className="text-center"
              style={{ fontSize: 'var(--text-body)', color: 'var(--color-primary)' }}
            >
              구독 신청이 완료됐어요.
            </p>
          )}

          <button
            type="button"
            onClick={() => navigate('/home')}
            className="self-center"
            style={{ fontSize: 'var(--text-body)', color: 'var(--color-gray)' }}
          >
            홈으로
          </button>
        </div>
      </main>
    </AppFrame>
  )
}
