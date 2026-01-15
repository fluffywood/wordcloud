/**
 * Rate limiting utilities for submission control
 */

import { getLastSubmissionTime, setLastSubmissionTime } from './localStorage'

// Rate limit duration in milliseconds (5 minutes)
const RATE_LIMIT_DURATION = 5 * 60 * 1000

/**
 * Check if user can submit (not rate limited)
 * @returns {boolean} - True if submission allowed
 */
export function canSubmit() {
  const lastSubmission = getLastSubmissionTime()

  if (!lastSubmission) return true

  const elapsed = Date.now() - lastSubmission
  return elapsed >= RATE_LIMIT_DURATION
}

/**
 * Get remaining time until next submission allowed
 * @returns {number} - Milliseconds remaining (0 if can submit)
 */
export function getRemainingTime() {
  const lastSubmission = getLastSubmissionTime()

  if (!lastSubmission) return 0

  const elapsed = Date.now() - lastSubmission
  const remaining = RATE_LIMIT_DURATION - elapsed

  return Math.max(0, remaining)
}

/**
 * Format remaining time as MM:SS string
 * @param {number} milliseconds - Time in milliseconds
 * @returns {string} - Formatted time string
 */
export function formatRemainingTime(milliseconds) {
  if (milliseconds <= 0) return '0:00'

  const totalSeconds = Math.ceil(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Record a submission (update rate limit timestamp)
 */
export function recordSubmission() {
  setLastSubmissionTime()
}

/**
 * Get rate limit duration in seconds
 * @returns {number} - Duration in seconds
 */
export function getRateLimitDuration() {
  return RATE_LIMIT_DURATION / 1000
}

export { RATE_LIMIT_DURATION }
