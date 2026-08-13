// 유리 재질(glassmorphism) 톤에서 값(색상/배경)만 따로 뺀 파일. 컴포넌트(Glass.jsx)와
// 분리해둔 이유는 순수 값·함수 export가 컴포넌트 export와 섞이면 React Fast Refresh가
// 깨지기 때문 (oxlint react(only-export-components) 규칙).

export const GLASS_BRAND_COLOR = '#146156'

// 배경 위에서 실제로 "유리" 느낌이 나려면 은은한 브랜드 컬러 배경이 함께 필요하다
// (화면 배경이 순백색이면 반투명 효과가 거의 안 보임). 홈 화면과 길찾기 화면이 공유.
export const GLASS_BACKGROUND_STYLE = {
  background: `linear-gradient(180deg, ${GLASS_BRAND_COLOR}26 0%, #ffffff 55%)`,
}
