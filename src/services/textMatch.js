/**
 * OCR 텍스트 비교 유틸리티.
 * OCR 결과는 매번 "결제하기" / "결제 하기" / "결제하 기" 등으로 조금씩 다르게 나올 수 있으므로
 * 정규화 + fuzzy 비교로 같은 의미의 텍스트를 찾아낸다.
 */

/**
 * 공백/줄바꿈/특수문자를 제거하고 대소문자를 통일한다.
 * @param {string} text
 * @returns {string}
 */
export function normalizeText(text) {
  if (!text) return ''
  return text
    .toLowerCase()
    .replace(/[\s\n\r]/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

/**
 * text 안에 target이 포함되어 있거나, 편집 거리가 target 길이의 25% 이내면 같은 텍스트로 본다.
 */
export function fuzzyIncludes(text, target) {
  if (!text || !target) return false
  if (text.includes(target) || target.includes(text)) return true
  return levenshteinDistance(text, target) <= Math.max(1, Math.floor(target.length * 0.25))
}

/**
 * 0~1 사이의 유사도 점수. 완전히 같으면 1, 전혀 다르면 0에 가깝다.
 * @param {string} a 정규화된 텍스트
 * @param {string} b 정규화된 텍스트
 */
export function textSimilarity(a, b) {
  if (!a || !b) return 0
  if (a === b) return 1

  if (a.includes(b) || b.includes(a)) {
    const longer = Math.max(a.length, b.length)
    const shorter = Math.min(a.length, b.length)
    return shorter / longer
  }

  const distance = levenshteinDistance(a, b)
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 0
  return Math.max(0, 1 - distance / maxLen)
}

function levenshteinDistance(a, b) {
  const rows = a.length + 1
  const cols = b.length + 1
  const dp = Array.from({ length: rows }, () => new Array(cols).fill(0))

  for (let i = 0; i < rows; i += 1) dp[i][0] = i
  for (let j = 0; j < cols; j += 1) dp[0][j] = j

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }

  return dp[rows - 1][cols - 1]
}
