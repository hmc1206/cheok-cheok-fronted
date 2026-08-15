/**
 * 촬영 이미지의 대략적인 색상 구성을 샘플링한다.
 *
 * 브랜드 판별은 텍스트(OCR) 키워드가 우선이고, 색상은 어디까지나 "보조 점수"로만
 * 쓰라는 요구사항에 따라 - 이 모듈은 정교한 이미지 분류가 아니라 아주 단순한 색상
 * 버킷 비율만 계산한다. 라이브러리 없이 canvas 픽셀만으로 구현한다.
 *
 * 반환하는 4가지 비율(0~1)은 각각:
 * - yellow: 노란색 계열 픽셀 비율(메가커피/맘스터치 공통 포인트 컬러)
 * - black: 검정/짙은 회색 계열 비율(메가커피 배경에 자주 쓰임)
 * - orange: 주황색 계열 비율(맘스터치 포인트 컬러)
 * - white: 흰색/밝은 회색 계열 비율(맘스터치 배경에 자주 쓰임)
 */

const SAMPLE_STEP = 6 // 4바이트(RGBA) * 6픽셀 간격으로 샘플링 - 성능을 위해 전체 픽셀을 다 보지 않는다.

/**
 * @param {ImageData} imageData
 * @returns {{ yellow: number, black: number, orange: number, white: number }}
 */
export function sampleColorProfile(imageData) {
  const { data } = imageData
  let yellow = 0
  let black = 0
  let orange = 0
  let white = 0
  let total = 0

  for (let i = 0; i < data.length; i += 4 * SAMPLE_STEP) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const brightness = (r + g + b) / 3

    if (brightness < 60) {
      // 어둡고 채도가 낮으면 검정/짙은 회색으로 본다.
      black += 1
    } else if (brightness > 210 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20) {
      // 밝고 R/G/B가 비슷하면 흰색/밝은 회색으로 본다.
      white += 1
    } else if (r > 200 && g > 160 && b < 120) {
      // R,G 모두 높고 B만 낮으면 노란색 계열.
      if (g > 190) {
        yellow += 1
      } else {
        // G가 상대적으로 덜 밝으면(R 우세) 주황색 계열로 본다.
        orange += 1
      }
    }

    total += 1
  }

  if (total === 0) return { yellow: 0, black: 0, orange: 0, white: 0 }

  return {
    yellow: yellow / total,
    black: black / total,
    orange: orange / total,
    white: white / total,
  }
}
