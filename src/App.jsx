import { useCallback } from 'react'
import Header from './components/Header'
import SubmissionForm from './components/SubmissionForm'
import WordCloudVisualization from './components/WordCloudVisualization'
import StatsDashboard from './components/StatsDashboard'
import Footer from './components/Footer'
import ScreenReaderAnnouncer from './components/ScreenReaderAnnouncer'
import { toast } from './components/CustomToast'
import { useSession } from './hooks/useSession'
import { useSubmissions } from './hooks/useSubmissions'
import { useVotes } from './hooks/useVotes'
import { usePhrases } from './hooks/usePhrases'

function App() {
  const { sessionId, resetSession } = useSession()
  const { submissions, loading: submissionsLoading, addSubmission } = useSubmissions()
  const { votes, votedPhrases, loading: votesLoading, voteForPhrase, hasVoted } = useVotes(sessionId)
  const { phrases, topPhrases, loading: phrasesLoading } = usePhrases(submissions, votes)

  const loading = submissionsLoading || votesLoading || phrasesLoading

  // Wrap voteForPhrase to add toast notifications
  const handleVote = useCallback(async (phraseText) => {
    // Check if already voted (client-side check for immediate feedback)
    if (hasVoted(phraseText)) {
      toast.error('You already voted for this!')
      return { success: false, error: 'Already voted' }
    }

    const result = await voteForPhrase(phraseText)
    if (result.success) {
      toast.success('Vote recorded!')
    } else if (result.error === 'Already voted') {
      toast.error('You already voted for this!')
    } else {
      toast.error('Failed to record vote')
    }
    return result
  }, [voteForPhrase, hasVoted])

  return (
    <div className="min-h-screen bg-page-bg text-text-primary">
      {/* Screen reader announcements for new submissions and votes */}
      <ScreenReaderAnnouncer submissions={submissions} votes={votes} />

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="animate-fade-in">
          <Header />
        </div>

        {/* Main Content */}
        <main className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Left Column: Form + Stats */}
          <div className="md:col-span-1 space-y-6">
            <div className="animate-fade-in-delay-1">
              <SubmissionForm
                sessionId={sessionId}
                onSubmit={addSubmission}
              />
            </div>
            <div className="animate-fade-in-delay-2">
              <StatsDashboard
                submissions={submissions}
                votes={votes}
                topPhrases={topPhrases}
                loading={loading}
              />
            </div>
          </div>

          {/* Right Column: Word Cloud */}
          <div className="md:col-span-1 lg:col-span-2 animate-fade-in-delay-1">
            <WordCloudVisualization
              phrases={phrases}
              votedPhrases={votedPhrases}
              onVote={handleVote}
              hasVoted={hasVoted}
              loading={loading}
            />
          </div>
        </main>

        {/* Footer */}
        <div className="animate-fade-in-delay-3">
          <Footer
            sessionId={sessionId}
            onResetSession={resetSession}
          />
        </div>
      </div>
    </div>
  )
}

export default App
