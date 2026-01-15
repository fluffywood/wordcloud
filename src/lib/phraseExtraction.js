import { isStopWord } from './stopWords'

/**
 * Extract meaningful phrases (n-grams) from text
 * @param {string} text - The input text to process
 * @returns {string[]} - Array of extracted phrases
 */
export function extractPhrasesFromText(text) {
  if (!text || typeof text !== 'string') return []

  // Convert to lowercase and normalize
  let normalized = text.toLowerCase()

  // Remove punctuation except hyphens (preserve compound words)
  normalized = normalized.replace(/[^\w\s-]/g, ' ')

  // Normalize multiple spaces to single space
  normalized = normalized.replace(/\s+/g, ' ').trim()

  // Split into words
  const words = normalized.split(' ')

  // Filter out stop words and words shorter than 3 characters
  const filteredWords = words.filter(word => {
    return word.length >= 3 && !isStopWord(word)
  })

  const phrases = []

  // Generate 1-grams (single words)
  filteredWords.forEach(word => {
    phrases.push(word)
  })

  // Generate 2-grams
  for (let i = 0; i < filteredWords.length - 1; i++) {
    phrases.push(`${filteredWords[i]} ${filteredWords[i + 1]}`)
  }

  // Generate 3-grams
  for (let i = 0; i < filteredWords.length - 2; i++) {
    phrases.push(`${filteredWords[i]} ${filteredWords[i + 1]} ${filteredWords[i + 2]}`)
  }

  return phrases
}

/**
 * Process all submissions and extract phrase frequencies
 * @param {Array} submissions - Array of submission objects with 'text' field
 * @returns {Map} - Map of phrase -> mention count
 */
export function extractAllPhrases(submissions) {
  const phraseCount = new Map()

  submissions.forEach(submission => {
    const phrases = extractPhrasesFromText(submission.text)

    phrases.forEach(phrase => {
      phraseCount.set(phrase, (phraseCount.get(phrase) || 0) + 1)
    })
  })

  return phraseCount
}

/**
 * Calculate combined scores (mentions + votes) for phrases
 * @param {Map} mentionCounts - Map of phrase -> mention count
 * @param {Array} votes - Array of vote objects with 'phrase_text' field
 * @returns {Array} - Array of { text, value, mentions, votes } sorted by score
 */
export function calculatePhraseScores(mentionCounts, votes) {
  // Count votes per phrase
  const voteCount = new Map()
  votes.forEach(vote => {
    const phrase = vote.phrase_text
    voteCount.set(phrase, (voteCount.get(phrase) || 0) + 1)
  })

  // Combine all unique phrases from both mentions and votes
  const allPhrases = new Set([...mentionCounts.keys(), ...voteCount.keys()])

  // Calculate scores
  const phraseScores = []
  allPhrases.forEach(phrase => {
    const mentions = mentionCounts.get(phrase) || 0
    const phraseVotes = voteCount.get(phrase) || 0
    const totalScore = mentions + phraseVotes

    // Only include phrases with score >= 2
    if (totalScore >= 2) {
      phraseScores.push({
        text: phrase,
        value: totalScore,
        mentions,
        votes: phraseVotes
      })
    }
  })

  // Sort by score descending and limit to top 100
  phraseScores.sort((a, b) => b.value - a.value)
  return phraseScores.slice(0, 100)
}

/**
 * Get top N phrases by score
 * @param {Array} phraseScores - Array of phrase score objects
 * @param {number} n - Number of top phrases to return
 * @returns {Array} - Top N phrases
 */
export function getTopPhrases(phraseScores, n = 5) {
  return phraseScores.slice(0, n)
}
