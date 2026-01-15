import { useCallback } from 'react'
import Header from './components/Header'
import SubmissionForm from './components/SubmissionForm'
import WordCloudVisualization from './components/WordCloudVisualization'
import StatsDashboard from './components/StatsDashboard'
import Footer from './components/Footer'
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
    const result = await voteForPhrase(phraseText)
    if (result.success) {
      toast.success('Vote recorded!')
    } else if (result.error === 'Already voted') {
      toast.error('You already voted for this!')
    } else {
      toast.error('Failed to record vote')
    }
    return result
  }, [voteForPhrase])

  return (
    <div className="min-h-screen bg-page-bg text-text-primary">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <Header />

        {/* Main Content */}
        <main className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Form + Stats */}
          <div className="lg:col-span-1 space-y-6">
            <SubmissionForm
              sessionId={sessionId}
              onSubmit={addSubmission}
            />
            <StatsDashboard
              submissions={submissions}
              votes={votes}
              topPhrases={topPhrases}
              loading={loading}
            />
          </div>

          {/* Right Column: Word Cloud */}
          <div className="lg:col-span-2">
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
        <Footer
          sessionId={sessionId}
          onResetSession={resetSession}
        />
      </div>
    </div>
  )
}

export default App
