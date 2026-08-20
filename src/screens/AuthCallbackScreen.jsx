import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../api/authApi'
import { AppFrame } from '../components/common/AppFrame'
import { BrandWordmark } from '../components/common/BrandWordmark'
import { useAuthStore } from '../store/authStore'
// 전체 QA 중 발견: 이 화면도 로그인 페이지와 완전히 똑같은 "아이콘 이미지 +
// 척척 텍스트" 헤더를 그대로 복붙해서 쓰고 있었다 — 로그인 페이지 로고 정리
// (아이콘 삭제, BrandWordmark 공통 컴포넌트 사용) 작업의 사실상 세 번째
// 중복 지점이라 같이 정리한다. 폰트 크기/자간/색상은 로그인 페이지와 원래
// 동일했던 값(19px, -0.05em, #111) 그대로 유지.

export function AuthCallbackScreen() {
  const navigate = useNavigate(); const [searchParams] = useSearchParams(); const setAuth = useAuthStore((state) => state.setAuth)
  useEffect(() => { const initAuth = async () => { const token = searchParams.get('token'); const isNewUser = searchParams.get('isNewUser') === 'true'; if (!token) { alert('로그인 정보가 유효하지 않습니다.'); navigate('/login', { replace: true }); return } setAuth({ token, userId: null, isNewUser }); try { const userData = await authApi.getMe(); setAuth({ token, userId: userData.userId, isNewUser }); navigate('/home', { replace: true }) } catch (error) { console.error('[콜백] 로그인 사용자 정보 조회 실패:', error); useAuthStore.getState().clearAuth(); alert('로그인 처리에 실패했습니다.'); navigate('/login', { replace: true }) } }; initAuth() }, [searchParams, navigate, setAuth])
  return <AppFrame><main className="salad-auth flex h-full min-h-0 flex-col bg-white px-6 py-6"><header className="flex items-center gap-2"><BrandWordmark className="text-[19px] font-bold tracking-[-0.05em] text-[#111]" /></header><section className="my-auto"><span className="salad-auth__loader block h-12 w-12 rounded-full" /><p className="mt-7 text-[15px] font-bold text-[var(--cb-tomato)]">안전하게 연결하고 있어요</p><h1 className="mt-2 text-[33px] font-bold leading-[1.27] tracking-[-0.06em] text-[#111]">로그인 정보를<br />확인하는 중입니다.</h1><p className="mt-4 text-[16px] font-medium leading-7 text-[#555c68]">잠시만 기다리면 바로 척척을 시작할 수 있어요.</p></section><p className="border-t border-[#f0f2f5] pt-5 text-[14px] font-medium text-[#9fa4b0]">로그인 세션을 확인하고 있어요.</p></main></AppFrame>
}
