import { useState, useEffect, useMemo } from 'react'
import { extractAllPhrases, calculatePhraseScores, getTopPhrases } from '../lib/phraseExtraction'

/**
 * Custom hook for extracting and calculating phrase scores
 */
export function usePhrases(submissions, votes) {
  const [loading, setLoading] = useState(true)

  // Extract phrases from submissions and calculate scores
  const { phrases, topPhrases } = useMemo(() => {
    if (!submissions || submissions.length === 0) {
      return { phrases: [], topPhrases: [] }
    }

    // Extract phrase mention counts from all submissions
    const mentionCounts = extractAllPhrases(submissions)

    // Calculate combined scores with votes
    const phraseScores = calculatePhraseScores(mentionCounts, votes || [])

    // Get top 5 for stats dashboard
    const top5 = getTopPhrases(phraseScores, 5)

    return {
      phrases: phraseScores,
      topPhrases: top5,
    }
  }, [submissions, votes])

  // Update loading state
  useEffect(() => {
    if (submissions) {
      setLoading(false)
    }
  }, [submissions])

  return {
    phrases,
    topPhrases,
    loading,
  }
}
