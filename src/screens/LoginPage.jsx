/** Design reminder — white product onboarding with a green, direct start action. */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppFrame } from '../components/common/AppFrame'
import { BrandWordmark } from '../components/common/BrandWordmark'
import { SeniorButton } from '../components/ui/SeniorButton'
import { useAuthStore } from '../store/authStore'
// 로그인 페이지 좌측 상단 로고 영역 수정(요청사항): 아이콘 이미지를 삭제하고
// "척척" 텍스트만 남긴다 — 홈 화면에서 이미 적용한 것과 완전히 동일한
// 패턴(components/common/BrandWordmark.jsx)을 재사용해, 두 화면이 각자
// 따로 구현했던 로고 마크업을 하나의 공통 컴포넌트로 통합했다. 폰트 크기
// (19px)/자간(-0.05em)/색상(#111)은 이 화면이 원래 쓰던 값 그대로 유지.
const apiOrigin = new URL(import.meta.env.VITE_API_BASE_URL ?? window.location.origin).origin
const GOOGLE_LOGIN_URL = `${apiOrigin}/oauth2/authorization/google`
// QA 중 발견: 이미 로그인된 상태로 /login에 들어오면(예: 로그인 후 브라우저
// 뒤로가기로 되돌아온 경우) 아래 useEffect가 즉시 /home으로 되돌려보내는데,
// replace 없이 push하면 히스토리에 로그인 화면이 그대로 남는다 — 그러면
// 홈에서 뒤로가기를 눌렀을 때 로그인 화면으로 갔다가 이 effect가 즉시 다시
// 홈으로 push해버려서 "뒤로가기가 안 먹히는" 것처럼 보인다. 스플래시
// 화면이 /login으로 넘어갈 때 이미 replace: true를 쓰는 것과 같은 이유로
// 여기도 replace로 맞춘다.
//
// QA 중 발견: 하단 소개 문구가 "길 찾기부터 기차 예매까지..."로 남아있었다 —
// 기차 예매(TRAIN_BOOKING)는 이미 예전에 "내 주변 병원·약국 찾기"로 완전히
// 대체된 기능이라(HomeScreen.jsx 주석 참고) 실제로 존재하지 않는 기능을
// 광고하는 문구였다. 지금 있는 기능으로 바꿨다.
export function LoginPage() { const navigate = useNavigate(); const token = useAuthStore((state) => state.token); useEffect(() => { if (token) navigate('/home', { replace: true }) }, [token, navigate]); const handleGoogleLogin = () => { window.location.href = GOOGLE_LOGIN_URL }; const handleDevBypass = () => { useAuthStore.getState().setAuth({ token: 'dev-fake-token', userId: 'dev-user', isNewUser: false }) }; return <AppFrame><main className="salad-login flex h-full min-h-0 flex-col bg-white px-6 pb-7 pt-6"><header className="flex items-center gap-2"><BrandWordmark className="text-[19px] font-bold tracking-[-0.05em] text-[#111]" /></header><section className="my-auto"><div className="salad-login__bubble flex h-[86px] w-[86px] items-center justify-center rounded-full"><span className="text-[32px] font-bold text-[var(--cb-tomato)]">+</span></div><p className="mt-7 text-[15px] font-bold text-[var(--cb-tomato)]">생활이 더 쉬워지는 시작</p><h1 className="mt-2 text-[34px] font-bold leading-[1.25] tracking-[-0.06em] text-[#111]">필요한 일을<br />쉽고 편하게 해결해요.</h1><p className="mt-4 max-w-[290px] text-[16px] font-medium leading-7 tracking-[-0.03em] text-[#555c68]">길 찾기부터 병원·약국 찾기까지, 매일 필요한 도움을 한 곳에서 받아보세요.</p></section><section className="border-t border-[#f0f2f5] pt-5"><SeniorButton type="button" onClick={handleGoogleLogin} leadingIcon={<GoogleMark />}>구글 계정으로 시작하기</SeniorButton>{import.meta.env.DEV ? <SeniorButton type="button" onClick={handleDevBypass} variant="quiet" className="mt-2">바로 둘러보기</SeniorButton> : null}</section></main></AppFrame> }
function GoogleMark() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M20 12.2c0 4.3-2.9 7.3-7.2 7.3A7.5 7.5 0 1 1 19.9 9H13v3.2h6.8" /></svg> }
