// 채팅 메시지 한 개를 그리는 말풍선 컴포넌트. role에 따라 정렬/색을 바꾼다:
// - user(내 메시지): 오른쪽 정렬, accent 컬러 채우기(눈에 띄는 쪽)
// - assistant(답변): 왼쪽 정렬, 옅은 회색 배경(.color-bg-alt) — 지금은 이 role로
//   들어오는 메시지가 실제로 생성되지 않는다(요구사항 5: 백엔드 미연결, 가짜 응답
//   금지). 나중에 실제 응답 API가 연결되면 그 응답을 그대로 이 컴포넌트에 넘기기만
//   하면 되도록 UI만 미리 만들어둔다.
export function ChatBubble({ role, text }) {
  const isUser = role === 'user'

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[80%] rounded-2xl px-4 py-3"
        style={{
          fontSize: 'var(--text-body)',
          background: isUser ? 'var(--color-primary)' : 'var(--color-bg-alt)',
          color: isUser ? 'var(--color-primary-contrast)' : 'var(--color-text)',
        }}
      >
        {text}
      </div>
    </div>
  )
}
