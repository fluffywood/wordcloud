/**
 * Stats dashboard component showing live metrics
 */
export default function StatsDashboard({ submissions, votes, topPhrases, loading }) {
  // Calculate unique participants (unique session_ids from both tables)
  const uniqueParticipants = new Set()

  submissions?.forEach(sub => {
    if (sub.session_id) uniqueParticipants.add(sub.session_id)
  })

  votes?.forEach(vote => {
    if (vote.session_id) uniqueParticipants.add(vote.session_id)
  })

  const stats = {
    totalSubmissions: submissions?.length || 0,
    totalVotes: votes?.length || 0,
    participants: uniqueParticipants.size,
  }

  return (
    <div className="bg-surface rounded-xl p-6 border border-border-default">
      <h2 className="text-xl font-semibold text-text-primary mb-4">
        Live Stats
      </h2>

      {loading ? (
        <StatsSkeleton />
      ) : (
        <>
          {/* Metrics grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard
              label="Submissions"
              value={stats.totalSubmissions}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              }
            />
            <StatCard
              label="Votes"
              value={stats.totalVotes}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              }
            />
            <StatCard
              label="Participants"
              value={stats.participants}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
          </div>

          {/* Top 5 Phrases */}
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Top Phrases
            </h3>

            {topPhrases && topPhrases.length > 0 ? (
              <ol className="space-y-2">
                {topPhrases.map((phrase, index) => (
                  <li
                    key={phrase.text}
                    className={`
                      flex items-center justify-between p-2 rounded-lg
                      ${index === 0 ? 'bg-primary-blue/20 border border-primary-blue/30' : 'bg-page-bg'}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`
                          w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold
                          ${index === 0 ? 'bg-primary-blue text-white' : 'bg-border-default text-text-muted'}
                        `}
                      >
                        {index + 1}
                      </span>
                      <span className={`font-medium ${index === 0 ? 'text-primary-blue' : 'text-text-primary'}`}>
                        {phrase.text}
                      </span>
                    </div>
                    <span className="text-sm text-text-muted font-mono">
                      {phrase.value}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-text-muted text-center py-4">
                No phrases yet. Be the first to submit!
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Individual stat card component
 */
function StatCard({ label, value, icon }) {
  return (
    <div className="text-center">
      <div className="text-text-muted mb-1 flex justify-center">
        {icon}
      </div>
      <div className="text-2xl font-bold text-text-primary">
        {value.toLocaleString()}
      </div>
      <div className="text-xs text-text-muted uppercase tracking-wide">
        {label}
      </div>
    </div>
  )
}

/**
 * Loading skeleton for stats
 */
function StatsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="text-center">
            <div className="h-5 w-5 bg-border-default rounded mx-auto mb-1" />
            <div className="h-8 w-12 bg-border-default rounded mx-auto mb-1" />
            <div className="h-3 w-16 bg-border-default rounded mx-auto" />
          </div>
        ))}
      </div>
      <div className="h-4 w-24 bg-border-default rounded mb-3" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-10 bg-border-default rounded" />
        ))}
      </div>
    </div>
  )
}
