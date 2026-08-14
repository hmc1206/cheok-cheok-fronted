import { AppFrame } from '../components/common/AppFrame'

// TODO: "이용한도 확인하기" 상세 화면. 아직 실제 화면 기획/디자인이 없어 라우팅
// 스텁만 만들어둔다(요청사항: "해당 화면이 아직 없다면 우선 라우팅 스텁만"). 표시할
// 상세 데이터(이용 내역, 한도 갱신일 등)도 API 명세서에 정의돼 있지 않아
// usageApi.js와 마찬가지로 백엔드 확인이 먼저 필요하다.
export function UsageLimitScreen() {
  return (
    <AppFrame>
      <main
        className="flex h-full items-center justify-center px-6 text-center"
        style={{ background: 'var(--color-bg)' }}
      >
        <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-gray)' }}>
          이용 한도 상세 화면은 준비 중입니다.
        </p>
      </main>
    </AppFrame>
  )
}
