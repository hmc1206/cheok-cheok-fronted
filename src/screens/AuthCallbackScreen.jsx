import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../api/authApi'
import { AppFrame } from '../components/common/AppFrame'
import { useAuthStore } from '../store/authStore'

export function AuthCallbackScreen() {
  const navigate = useNavigate(); const [searchParams] = useSearchParams(); const setAuth = useAuthStore((state) => state.setAuth)
  useEffect(() => { const initAuth = async () => { const token = searchParams.get('token'); const isNewUser = searchParams.get('isNewUser') === 'true'; if (!token) { alert('로그인 정보가 유효하지 않습니다.'); navigate('/login', { replace: true }); return } setAuth({ token, userId: null, isNewUser }); try { const userData = await authApi.getMe(); setAuth({ token, userId: userData.userId, isNewUser }); navigate('/home', { replace: true }) } catch (error) { console.error('[콜백] 로그인 사용자 정보 조회 실패:', error); useAuthStore.getState().clearAuth(); alert('로그인 처리에 실패했습니다.'); navigate('/login', { replace: true }) } }; initAuth() }, [searchParams, navigate, setAuth])
  return <AppFrame><main className="salad-auth flex h-full min-h-0 flex-col bg-white px-6 py-6"><header className="flex items-center gap-2"><span className="salad-login__mark flex h-9 w-9 items-center justify-center"><img src="/manus-storage/cheok-logo-mark_977663d4.png" alt="척척 로고" className="h-5 w-5" /></span><span className="text-[19px] font-bold tracking-[-0.05em] text-[#111]">척척</span></header><section className="my-auto"><span className="salad-auth__loader block h-12 w-12 rounded-full" /><p className="mt-7 text-[15px] font-bold text-[#13bd7e]">안전하게 연결하고 있어요</p><h1 className="mt-2 text-[33px] font-bold leading-[1.27] tracking-[-0.06em] text-[#111]">로그인 정보를<br />확인하는 중입니다.</h1><p className="mt-4 text-[16px] font-medium leading-7 text-[#555c68]">잠시만 기다리면 바로 척척을 시작할 수 있어요.</p></section><p className="border-t border-[#f0f2f5] pt-5 text-[14px] font-medium text-[#9fa4b0]">로그인 세션을 확인하고 있어요.</p></main></AppFrame>
}
