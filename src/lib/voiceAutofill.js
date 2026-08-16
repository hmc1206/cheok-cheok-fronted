/**
 * Design reminder — voice handoff stays transparent: field values are taken from explicit API slots first,
 * then from a conservative Korean sentence pattern only when the API has no structured value.
 */
function firstText(sources, keys) {
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue
    for (const key of keys) {
      const value = source[key]
      if (typeof value === 'string' && value.trim()) return value.trim()
    }
  }
  return ''
}

function parseRouteTranscript(transcript = '') {
  const match = transcript
    .replace(/\s+/g, ' ')
    .match(/(.+?)(?:에서|부터)\s*(.+?)(?:까지|로)(?:\s|$)/)

  return {
    startName: match?.[1]?.trim() ?? '',
    goalName: match?.[2]?.trim() ?? '',
  }
}

export function resolveMapAutofill({ slots, data, transcript } = {}) {
  const sources = [slots, data?.slots, data]
  const parsed = parseRouteTranscript(transcript)
  return {
    startName: firstText(sources, ['startName', 'start', 'origin', 'departure', 'from']) || parsed.startName,
    goalName: firstText(sources, ['goalName', 'goal', 'destination', 'arrival', 'to', 'end']) || parsed.goalName,
  }
}

