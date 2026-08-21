import { create } from 'zustand'

// 마이크 권한 상태만 담는 스토어(다른 store들과 동일한 패턴). 실제
// permissions.query()/getUserMedia 호출은 useMicPermission 훅에서 하고, 여기는
// 상태값만 전역으로 들고 있어 Provider로 앱을 감싸지 않아도 어디서든
// useMicPermissionStore로 구독할 수 있다.
//
// 상태값: idle(아직 확인 전) | prompt(확인 필요, 모달 노출) | granted | denied |
// unsupported(getUserMedia 자체 미지원 브라우저)
export const useMicPermissionStore = create((set) => ({
  status: 'idle',
  setStatus: (status) => set({ status }),
}))
