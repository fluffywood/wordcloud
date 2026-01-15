import { useState, useEffect } from 'react'
import { getRemainingTime, formatRemainingTime } from '../utils/rateLimiting'

/**
 * Countdown timer component for rate limiting
 */
export default function RateLimitCountdown({ onExpire }) {
  const [remaining, setRemaining] = useState(getRemainingTime())

  useEffect(() => {
    // Update every second
    const interval = setInterval(() => {
      const newRemaining = getRemainingTime()
      setRemaining(newRemaining)

      if (newRemaining <= 0) {
        clearInterval(interval)
        onExpire?.()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [onExpire])

  if (remaining <= 0) return null

  return (
    <div className="flex items-center gap-2 text-warning">
      <svg
        className="w-5 h-5 animate-pulse"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span className="font-medium">
        Next submission in {formatRemainingTime(remaining)}
      </span>
    </div>
  )
}
