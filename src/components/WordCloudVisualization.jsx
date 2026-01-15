import { useCallback, useMemo, useState } from 'react'
import ReactWordcloud from 'react-wordcloud'
import 'tippy.js/dist/tippy.css'
import 'tippy.js/animations/scale.css'

/**
 * Word cloud visualization component
 */
export default function WordCloudVisualization({
  phrases,
  votedPhrases,
  onVote,
  hasVoted,
  loading,
}) {
  const [hoveredWord, setHoveredWord] = useState(null)

  // Transform phrases data for react-wordcloud
  const words = useMemo(() => {
    if (!phrases || phrases.length === 0) return []

    return phrases.map(phrase => ({
      text: phrase.text,
      value: phrase.value,
      mentions: phrase.mentions,
      votes: phrase.votes,
    }))
  }, [phrases])

  // Word cloud options
  const options = useMemo(() => ({
    rotations: 2,
    rotationAngles: [0, 0],
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSizes: [16, 64],
    fontWeight: 'bold',
    padding: 4,
    deterministic: true,
    enableTooltip: true,
    transitionDuration: 500,
  }), [])

  // Callbacks for word cloud interactions
  const callbacks = useMemo(() => ({
    onWordClick: (word) => {
      if (!hasVoted(word.text)) {
        onVote(word.text)
      }
    },
    onWordMouseOver: (word) => {
      setHoveredWord(word)
    },
    onWordMouseOut: () => {
      setHoveredWord(null)
    },
    getWordColor: (word) => {
      // Check if user has voted for this phrase
      const isVoted = votedPhrases?.includes(word.text)

      if (isVoted) {
        return '#06B6D4' // cyan-accent for voted
      }

      // Blue gradient based on score
      const maxValue = words.length > 0 ? Math.max(...words.map(w => w.value)) : 1
      const ratio = word.value / maxValue

      if (ratio > 0.75) {
        return '#38BDF8' // bright-cyan
      } else if (ratio > 0.5) {
        return '#06B6D4' // cyan-accent
      } else if (ratio > 0.25) {
        return '#60A5FA' // accent-blue
      } else {
        return '#3B82F6' // primary-blue
      }
    },
    getWordTooltip: (word) => {
      return `${word.mentions || 0} mentions, ${word.votes || 0} votes`
    },
  }), [words, votedPhrases, hasVoted, onVote])

  // Empty state
  if (!loading && (!words || words.length === 0)) {
    return (
      <div className="bg-surface rounded-xl p-8 border border-border-default min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto text-text-muted mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
          <h3 className="text-xl font-semibold text-text-primary mb-2">
            No Ideas Yet
          </h3>
          <p className="text-text-secondary">
            Be the first to submit an idea!
          </p>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="bg-surface rounded-xl p-8 border border-border-default min-h-[400px]">
        <WordCloudSkeleton />
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-xl p-6 border border-border-default">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-text-primary">
          Community Ideas
        </h2>
        <span className="text-sm text-text-muted">
          Click a phrase to vote
        </span>
      </div>

      {/* Word cloud container */}
      <div
        className="min-h-[400px] lg:min-h-[500px] rounded-lg overflow-hidden"
        style={{ cursor: 'pointer' }}
      >
        <ReactWordcloud
          words={words}
          options={options}
          callbacks={callbacks}
        />
      </div>

      {/* Hover tooltip (custom) */}
      {hoveredWord && (
        <div className="mt-4 p-3 bg-page-bg rounded-lg border border-border-default">
          <p className="text-text-primary font-medium">
            &quot;{hoveredWord.text}&quot;
          </p>
          <p className="text-sm text-text-secondary mt-1">
            {hoveredWord.mentions || 0} mentions • {hoveredWord.votes || 0} votes
            {votedPhrases?.includes(hoveredWord.text) && (
              <span className="ml-2 text-cyan-accent">✓ You voted</span>
            )}
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Loading skeleton for word cloud
 */
function WordCloudSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-32 bg-border-default rounded" />
        <div className="h-4 w-24 bg-border-default rounded" />
      </div>
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-wrap gap-4 justify-center items-center p-8">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="h-6 bg-border-default rounded"
              style={{
                width: `${Math.random() * 80 + 40}px`,
                opacity: Math.random() * 0.5 + 0.5,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
