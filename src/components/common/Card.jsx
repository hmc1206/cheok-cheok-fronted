// 디자인 브리프 "Cards" 규칙(흰 배경, radius-lg, 옅은 그림자, md 패딩)을 index.css의
// .app-card 클래스로 구현하고, 이 컴포넌트는 얇은 래퍼로만 둔다.
export function Card({ children, className = '', ...rest }) {
  return (
    <div className={`app-card ${className}`} {...rest}>
      {children}
    </div>
  )
}
