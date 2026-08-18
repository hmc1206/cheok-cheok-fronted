/** Design reminder — a fixed two-stage board indicator: input, then launch. */

// 길찾기(MapRouteScreen.jsx)에서 처음 만든 "입력/실행" 2단계 상단 탭 인디케이터를
// 영상 도움(YoutubePlayerScreen.jsx)에도 그대로 쓰게 되면서 공용 컴포넌트로 뺐다 —
// 두 화면 다 새로 만들지 않고 이 컴포넌트 하나를 재사용한다(요청사항: "탭 전환
// UI가 있다면 공통 컴포넌트로 분리"). labels/current를 props로 받게 해서, 두
// 화면 모두 지금처럼 2단계('입력'/'실행')로 쓰지만 나중에 다른 화면이 다른
// 라벨/단계 수로 재사용할 수도 있다.
// Tailwind는 클래스명을 소스에 적힌 "그대로의 문자열"만 스캔해서 CSS를
// 생성한다 — `grid-cols-${labels.length}`처럼 런타임에 문자열을 조립하면
// 스캐너가 그 클래스를 못 찾아 스타일이 안 나온다. 그래서 쓸 수 있는 칸
// 수만큼 정적 클래스명을 미리 다 적어두고 조회하는 방식을 쓴다(지금은
// 두 화면 다 2단계만 쓰지만, 나중에 3단계짜리가 생겨도 바로 대응 가능).
const GRID_COLS_CLASS = {
  // 1: 날씨 화면이 "입력" 탭을 없애고 "실행" 하나만 남기면서 추가됨(요청사항) —
  // 이 화면은 진입 즉시 자동으로 조회를 시작해서 사용자가 직접 입력하는 단계가
  // 없다.
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
}

// showNumbers: 길찾기/병원·약국 찾기/영상 도움은 "01"/"02" 번호가 실제로
// 몇 단계 중 몇 번째인지 알려주는 정보라 계속 보여준다(기본값 true, 그 화면들은
// 손대지 않음). 날씨 화면은 탭이 "실행" 하나뿐이라 "01"이 아무 의미 없는
// 장식이 되어서(요청사항: "01 빼줘") 숫자를 아예 안 그리도록 껐다.
export function ProgressStrip({ labels, current, showNumbers = true }) {
  return (
    <div
      className={`control-progress grid ${GRID_COLS_CLASS[labels.length] ?? 'grid-cols-2'}`}
      aria-label="진행 단계"
    >
      {labels.map((label, index) => (
        <div key={label} className={index + 1 === current ? 'is-current' : ''}>
          {showNumbers ? <span>0{index + 1}</span> : null}
          <strong>{label}</strong>
        </div>
      ))}
    </div>
  )
}
