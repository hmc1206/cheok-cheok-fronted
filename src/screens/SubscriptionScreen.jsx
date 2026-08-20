import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { subscriptionApi } from '../api/subscriptionApi'
import { usageApi } from '../api/usageApi'
import { AppFrame } from '../components/common/AppFrame'
import { MobileHeader } from '../components/common/MobileHeader'
import { SeniorButton } from '../components/ui/SeniorButton'

// 홈 화면 헤더의 구독 아이콘에서 진입하는 구독 신청 화면(HomeScreen.jsx 참고).
// API 명세서 v2.0에 구독/결제 엔드포인트가 전혀 없어(subscriptionApi.js 주석
// 참고), "신청하기" 버튼은 실제 결제를 일으키지 않는 mock이다.
//
// 상단 구조: 요구사항 문서 초안엔 "구독 신청 화면"이라는 타이틀 텍스트가 따로
// 있었는데, 이전 라운드 피드백으로 그 타이틀을 없애고 뒤로가기 버튼만 남기기로
// 확정했다 — MobileHeader에 title=""을 넘겨 뒤로가기 자리(헤더 높이)는 다른
// 화면들과 통일하되 타이틀 텍스트는 표시하지 않는다. 그 아래 "월 구독 신청"
// 소제목이 자연스럽게 화면 맨 위 콘텐츠가 된다.
export function SubscriptionScreen() {
  const navigate = useNavigate()
  const [remainingFreeUsage, setRemainingFreeUsage] = useState(null)
  const [subscribeStatus, setSubscribeStatus] = useState('idle') // idle | loading | done

  // "현재 이용 상태" 카드 — 홈 화면과 동일하게 usageApi.js(mock)에서 가져온다.
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
      <main className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--cb-cream)]">
        <MobileHeader title="" onBack={() => navigate(-1)} />

        <div className="flex-1 overflow-y-auto px-5 pb-8 pt-2">
          <h1 className="text-[26px] font-extrabold leading-[1.15] tracking-[-0.05em] text-[var(--cb-navy)]">
            월 구독 신청
          </h1>
          <p className="mt-2 text-[15px] font-medium leading-6 text-[var(--cb-slate)]">
            매달 자동으로 결제되는 정기 구독으로, 무료 이용 횟수 제한 없이 척척의 모든 기능을
            이용하실 수 있어요.
          </p>

          {/* QA 중 발견: "KTX 예매·키오스크·앱 연결 모두 사용 가능"이 기차 예매
              (TRAIN_BOOKING, 이미 "내 주변 병원·약국 찾기"로 대체된 기능)를 그대로
              언급하고 있었다 — 존재하지 않는 기능을 구독 혜택으로 광고하는
              문구였다. 지금 있는 기능으로 바꿨다. */}
          <SectionCard title="구독 혜택" className="mt-5">
            <ul className="flex flex-col gap-2">
              {['무제한 이용', '광고 없이 사용', '병원·약국 찾기·키오스크·앱 연결 모두 사용 가능'].map(
                (benefit) => (
                  <li key={benefit} className="flex items-center gap-2">
                    <CheckGlyph />
                    <span className="text-[15px] font-semibold text-[var(--cb-navy)]">{benefit}</span>
                  </li>
                ),
              )}
            </ul>
          </SectionCard>

          <SectionCard title="구독 요금" className="mt-4">
            <p className="text-[24px] font-extrabold tracking-[-0.04em] text-[var(--cb-tomato)]">
              월 3,900원
            </p>
            <p className="mt-1 text-[14px] font-medium text-[var(--cb-slate)]">
              자동 결제되며, 언제든 해지할 수 있어요.
            </p>
          </SectionCard>

          {/* HomeScreen.jsx "현재 이용 상태"와 완전히 같은 usageApi 데이터 소스라
              두 화면에서 보이는 값이 서로 다르지 않다. */}
          <SectionCard title="현재 이용 상태" className="mt-4" accent>
            <p className="text-[15px] font-semibold text-[var(--cb-navy)]">
              {remainingFreeUsage === null
                ? '확인 중...'
                : `이번 달 무료 이용 ${remainingFreeUsage}회 남았어요`}
            </p>
          </SectionCard>

          <section className="mt-5">
            <h2 className="text-[15px] font-extrabold tracking-[-0.03em] text-[var(--cb-navy)]">
              신청 전 꼭 확인해 주세요
            </h2>
            <ul className="mt-2 flex flex-col gap-1 pl-5">
              {[
                '신청하면 지금 바로 구독이 시작돼요.',
                '첫 결제는 오늘 진행돼요.',
                '해지하면 다음 달부터 요금이 청구되지 않아요.',
              ].map((notice) => (
                <li
                  key={notice}
                  className="text-[14px] font-medium leading-6 text-[var(--cb-slate)]"
                  style={{ listStyle: 'disc' }}
                >
                  {notice}
                </li>
              ))}
            </ul>
          </section>

          <SeniorButton onClick={handleSubscribe} disabled={subscribeStatus !== 'idle'} className="mt-6">
            {subscribeStatus === 'loading' ? '신청 처리 중...' : '월 구독 신청하기'}
          </SeniorButton>

          {subscribeStatus === 'done' && (
            <p className="mt-3 text-center text-[15px] font-bold text-[var(--cb-tomato)]">
              구독 신청이 완료됐어요.
            </p>
          )}

          <button
            type="button"
            onClick={() => navigate('/home')}
            className="mt-4 block w-full text-center text-[15px] font-bold text-[var(--cb-slate)]"
          >
            홈으로
          </button>
        </div>
      </main>
    </AppFrame>
  )
}

// accent=true면 --cb-gold 배경으로 살짝 강조한다("현재 이용 상태" 카드 전용).
function SectionCard({ title, children, className = '', accent = false }) {
  return (
    <section
      className={`rounded-2xl border p-4 ${className}`}
      style={{ borderColor: 'var(--cb-line)', background: accent ? 'var(--cb-gold)' : '#fff' }}
    >
      <h2 className="mb-2 text-[15px] font-extrabold tracking-[-0.03em] text-[var(--cb-navy)]">
        {title}
      </h2>
      {children}
    </section>
  )
}

function CheckGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--cb-tomato)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
