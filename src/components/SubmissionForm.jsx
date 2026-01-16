import { useState, useCallback, useEffect, useRef } from 'react'
import RateLimitCountdown from './RateLimitCountdown'
import { containsProfanity, getProfanityErrorMessage } from '../lib/profanityFilter'
import { canSubmit, recordSubmission } from '../utils/rateLimiting'

const MAX_CHARS = 200
const MIN_CHARS = 3

/**
 * Submission form component for idea input
 */
export default function SubmissionForm({ sessionId, onSubmit }) {
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRateLimited, setIsRateLimited] = useState(!canSubmit())
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const textareaRef = useRef(null)

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Check rate limit on mount and after expiry
  useEffect(() => {
    setIsRateLimited(!canSubmit())
  }, [])

  // Auto-hide success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const handleRateLimitExpire = useCallback(() => {
    setIsRateLimited(false)
  }, [])

  const validate = useCallback((value) => {
    const trimmed = value.trim()

    if (trimmed.length === 0) {
      return 'Please enter an idea'
    }

    if (trimmed.length < MIN_CHARS) {
      return `Idea must be at least ${MIN_CHARS} characters`
    }

    if (trimmed.length > MAX_CHARS) {
      return `Idea must be ${MAX_CHARS} characters or less`
    }

    if (containsProfanity(trimmed)) {
      return getProfanityErrorMessage()
    }

    return ''
  }, [])

  const handleChange = useCallback((e) => {
    const value = e.target.value

    // Limit to MAX_CHARS
    if (value.length <= MAX_CHARS) {
      setText(value)
      setError('') // Clear error on change
      setSuccessMessage('') // Clear success message on change
    }
  }, [])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()

    // Clear previous messages
    setSuccessMessage('')
    setError('')

    // Validate
    const validationError = validate(text)
    if (validationError) {
      setError(validationError)
      return
    }

    // Check rate limit
    if (!canSubmit()) {
      setIsRateLimited(true)
      setError('Please wait before submitting again')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await onSubmit(text, sessionId)

      if (result.success) {
        setSuccessMessage('Idea submitted successfully!')
        setText('')
        recordSubmission()
        setIsRateLimited(true)
        textareaRef.current?.focus()
      } else {
        setError(result.error || 'Failed to submit idea')
      }
    } catch (err) {
      setError('Something went wrong')
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }, [text, sessionId, onSubmit, validate])

  const handleKeyDown = useCallback((e) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }, [handleSubmit])

  const charCount = text.length
  const isNearLimit = charCount > MAX_CHARS * 0.9
  const isDisabled = isSubmitting || isRateLimited

  return (
    <div className="bg-surface hover:bg-surface-elevated rounded-xl p-6 border border-border-default transition-colors duration-200">
      <h2 className="text-xl font-semibold text-text-primary mb-4">
        Submit Your Idea
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Textarea */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="What should I build? (e.g., 'AI coding assistant with voice control')"
            disabled={isDisabled}
            rows={4}
            className={`
              w-full p-4 rounded-lg resize-none
              bg-page-bg border-2 transition-colors duration-200
              text-text-primary placeholder-text-muted
              focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? 'border-error' : 'border-border-default hover:border-border-highlight'}
            `}
            aria-label="Idea submission"
            aria-describedby={error ? 'submission-error' : undefined}
          />

          {/* Character counter */}
          <div
            className={`
              absolute bottom-3 right-3 text-sm font-mono
              ${isNearLimit ? 'text-warning' : 'text-text-muted'}
              ${charCount > MAX_CHARS ? 'text-error' : ''}
            `}
          >
            {charCount}/{MAX_CHARS}
          </div>
        </div>

        {/* Success message */}
        {successMessage && (
          <p
            className="text-sm text-success flex items-center gap-2"
            role="status"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {successMessage}
          </p>
        )}

        {/* Error message */}
        {error && (
          <p
            id="submission-error"
            className="text-sm text-error flex items-center gap-2"
            role="alert"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}

        {/* Rate limit countdown */}
        {isRateLimited && (
          <RateLimitCountdown onExpire={handleRateLimitExpire} />
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isDisabled}
          className={`
            w-full py-3 px-6 rounded-lg font-semibold text-lg
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 focus:ring-offset-page-bg
            ${isDisabled
              ? 'bg-text-muted cursor-not-allowed text-text-secondary'
              : 'bg-primary-blue hover:bg-electric-blue text-white'
            }
          `}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Submitting...
            </span>
          ) : (
            'Submit Idea'
          )}
        </button>
      </form>
    </div>
  )
}
