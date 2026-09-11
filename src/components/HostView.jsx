import { useMemo, useState } from 'react'
import Brand from './Brand'
import ConnectionBadge from './ConnectionBadge'
import QrPanel from './QrPanel'
import StatsDashboard from './StatsDashboard'
import WordCloudVisualization from './WordCloudVisualization'

export default function HostView({ livePoll }) {
  const {
    aggregates,
    clearResponses,
    connection,
    error,
    joinUrl,
    loading,
    question,
    responses,
  } = livePoll
  const [clearing, setClearing] = useState(false)
  const [actionError, setActionError] = useState('')

  const stats = useMemo(() => ({
    answers: responses.length,
    participants: responses.length,
    unique: aggregates.length,
  }), [aggregates.length, responses])

  const handleClear = async () => {
    if (responses.length === 0 || !window.confirm('确定清空当前问题的全部答案吗？此操作无法撤销。')) return
    setActionError('')
    setClearing(true)
    try {
      await clearResponses()
    } catch (nextError) {
      setActionError(nextError.message)
    } finally {
      setClearing(false)
    }
  }

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen?.()
      } else {
        await document.documentElement.requestFullscreen?.()
      }
    } catch {
      setActionError('浏览器未允许进入全屏，请使用浏览器菜单手动开启')
    }
  }

  return (
    <div className="host-shell">
      <div className="ambient ambient--one" />
      <div className="ambient ambient--two" />

      <header className="host-header">
        <Brand />
        <div className="host-header__actions">
          <ConnectionBadge connection={connection} />
          <button type="button" className="icon-button" onClick={toggleFullscreen} title="切换全屏">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m8 0h3a2 2 0 0 0 2-2v-3" />
            </svg>
            <span>全屏</span>
          </button>
        </div>
      </header>

      <main className="host-main">
        <section className="host-intro">
          <div className="question-hero">
            <span className="question-hero__label">本轮问题</span>
            {loading ? <div className="question-skeleton" /> : <h1>{question?.text}</h1>}
          </div>
          <div className="answer-counter answer-counter--hero" aria-live="polite">
            <strong>{stats.answers}</strong><span>份回答</span>
          </div>
        </section>

        {(error || actionError) && <div className="error-banner" role="alert">{actionError || error}</div>}

        <section className="host-grid">
          <div className="cloud-card glass-card">
            <WordCloudVisualization words={aggregates} loading={loading} />
            <div className="cloud-card__footer">
              <span><i className="live-pulse" /> 新答案将自动出现在这里</span>
              <button type="button" className="danger-link" onClick={handleClear} disabled={!responses.length || clearing}>
                {clearing ? '正在清空…' : '清空答案'}
              </button>
            </div>
          </div>

          <div className="host-sidebar">
            <QrPanel joinUrl={joinUrl} />
            <StatsDashboard
              repeatable={Boolean(question?.allowRepeatResponses)}
              stats={stats}
              topAnswers={aggregates.slice(0, 4)}
            />
          </div>
        </section>
      </main>

      <footer className="host-footer">
        <span>WORD FLOW · LIVE AUDIENCE CLOUD</span>
        <span>打开大屏后，参与者扫码即可开始</span>
      </footer>
    </div>
  )
}
