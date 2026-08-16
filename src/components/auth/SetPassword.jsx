/**
 * Design reminder — Editorial Clarity: password fields use explicit labels, high contrast and ample spacing.
 * This presentational form receives its submit handler from the integrating screen so it never invents an API contract.
 */
import { useState } from 'react'
import { SeniorButton } from '../ui/SeniorButton'
import { SeniorInput } from '../ui/SeniorInput'

export function SetPassword({ onSubmit, isPending = false }) {
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (password.length < 8) {
      setError('비밀번호는 8자 이상으로 입력해 주세요.')
      return
    }
    if (password !== passwordConfirm) {
      setError('두 비밀번호가 서로 다릅니다. 다시 확인해 주세요.')
      return
    }
    setError('')
    await onSubmit?.({ password, passwordConfirm })
  }

  return (
    <form onSubmit={handleSubmit} className="login-page-motion mx-auto flex w-full max-w-lg flex-col gap-6 bg-white p-6 sm:p-10">
      <div className="flex flex-col gap-4 border-l-4 border-black pl-5">
        <p className="text-[18px] font-semibold text-[#1a1a1a]">비밀번호 설정</p>
        <h1 className="text-[32px] font-extrabold leading-tight tracking-[-0.04em] text-black">안전한 비밀번호를 만들어 주세요.</h1>
        <p className="text-[18px] font-medium leading-8 text-[#1a1a1a]">영문, 숫자, 기호를 섞어 8자 이상 입력하면 더 안전합니다.</p>
      </div>
      <SeniorInput
        id="new-password"
        label="새 비밀번호"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <SeniorInput
        id="confirm-password"
        label="새 비밀번호 다시 입력"
        type="password"
        autoComplete="new-password"
        value={passwordConfirm}
        onChange={(event) => setPasswordConfirm(event.target.value)}
        error={error}
      />
      <SeniorButton type="submit" disabled={isPending}>
        {isPending ? '비밀번호를 확인하고 있어요' : '비밀번호 설정 완료'}
      </SeniorButton>
    </form>
  )
}
