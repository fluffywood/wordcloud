/**
 * Footer component with session info and credits
 */
export default function Footer({ sessionId, onResetSession }) {
  // Truncate session ID for display
  const truncatedId = sessionId
    ? `${sessionId.slice(0, 8)}...${sessionId.slice(-4)}`
    : '...'

  return (
    <footer className="mt-12 py-6 border-t border-border-default">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Session info */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-muted">Session:</span>
          <code className="font-mono text-xs text-text-secondary bg-page-bg px-2 py-1 rounded">
            {truncatedId}
          </code>
          <button
            onClick={onResetSession}
            className="text-sm text-text-muted hover:text-primary-blue transition-colors duration-200 underline underline-offset-2"
            aria-label="Reset session"
          >
            Reset
          </button>
        </div>

        {/* Credits */}
        <div className="text-sm text-text-muted">
          Built with{' '}
          <span className="text-primary-blue">React</span>
          {' + '}
          <span className="text-success">Supabase</span>
        </div>
      </div>
    </footer>
  )
}
