const graphemeSegmenter = typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter('zh-CN', { granularity: 'grapheme' })
  : null

const unsafeInvisiblePattern = /[\p{Cc}\u200B\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/u

export function splitGraphemes(value = '') {
  const text = String(value)
  return graphemeSegmenter
    ? [...graphemeSegmenter.segment(text)].map(({ segment }) => segment)
    : Array.from(text)
}

export function countGraphemes(value = '') {
  return splitGraphemes(value).length
}

export function limitGraphemes(value, maximum) {
  return splitGraphemes(value).slice(0, maximum).join('')
}

export function cleanAnswerText(value) {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/gu, ' ')
}

export function normalizeAnswer(value) {
  return cleanAnswerText(value).toLocaleLowerCase('zh-CN')
}

export function hasUnsafeInvisibleCharacters(value) {
  return unsafeInvisiblePattern.test(value)
}
