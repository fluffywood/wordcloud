import { useState, useEffect } from 'react'

/**
 * ScreenReaderAnnouncer - An accessible component that announces
 * new submissions and votes to screen readers using aria-live regions
 */
export function ScreenReaderAnnouncer({ submissions, votes }) {
  const [announcement, setAnnouncement] = useState('')
  const [prevSubmissionCount, setPrevSubmissionCount] = useState(null)
  const [prevVoteCount, setPrevVoteCount] = useState(null)

  // Initialize counts on first load
  useEffect(() => {
    if (prevSubmissionCount === null && submissions.length > 0) {
      setPrevSubmissionCount(submissions.length)
    }
    if (prevVoteCount === null && votes.length > 0) {
      setPrevVoteCount(votes.length)
    }
  }, [submissions.length, votes.length, prevSubmissionCount, prevVoteCount])

  // Announce new submissions
  useEffect(() => {
    if (prevSubmissionCount !== null && submissions.length > prevSubmissionCount) {
      const newCount = submissions.length - prevSubmissionCount
      const newSubmission = submissions[0] // Most recent is first
      const message = newCount === 1
        ? `New idea submitted: ${newSubmission?.text || 'new submission'}`
        : `${newCount} new ideas submitted`
      setAnnouncement(message)
      setPrevSubmissionCount(submissions.length)

      // Clear announcement after a delay
      const timer = setTimeout(() => setAnnouncement(''), 3000)
      return () => clearTimeout(timer)
    } else if (prevSubmissionCount !== null && submissions.length !== prevSubmissionCount) {
      setPrevSubmissionCount(submissions.length)
    }
  }, [submissions, prevSubmissionCount])

  // Announce new votes
  useEffect(() => {
    if (prevVoteCount !== null && votes.length > prevVoteCount) {
      const newCount = votes.length - prevVoteCount
      const newVote = votes[votes.length - 1] // Most recent vote
      const message = newCount === 1
        ? `Vote recorded for: ${newVote?.phrase_text || 'phrase'}`
        : `${newCount} new votes recorded`
      setAnnouncement(message)
      setPrevVoteCount(votes.length)

      // Clear announcement after a delay
      const timer = setTimeout(() => setAnnouncement(''), 3000)
      return () => clearTimeout(timer)
    } else if (prevVoteCount !== null && votes.length !== prevVoteCount) {
      setPrevVoteCount(votes.length)
    }
  }, [votes, prevVoteCount])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  )
}

export default ScreenReaderAnnouncer
