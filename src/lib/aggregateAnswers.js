import { normalizeAnswer } from './text.js'

export function aggregateAnswers(responses = []) {
  const grouped = new Map()

  for (const response of responses) {
    const answers = Array.isArray(response?.answers)
      ? response.answers
      : response?.text
        ? [response]
        : []

    for (const answer of answers) {
      const text = typeof answer === 'string' ? answer : answer?.text
      if (typeof text !== 'string' || !text.trim()) continue
      const normalizedText = typeof answer === 'object' ? answer.normalizedText : ''
      const key = normalizedText || normalizeAnswer(text)
      const current = grouped.get(key)

      if (current) {
        current.value += 1
      } else {
        grouped.set(key, {
          text,
          value: 1,
          firstSeenAt: response.createdAt,
        })
      }
    }
  }

  return [...grouped.values()].sort((a, b) => (
    b.value - a.value || new Date(a.firstSeenAt) - new Date(b.firstSeenAt)
  ))
}
