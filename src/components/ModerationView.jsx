import { useMemo, useState } from 'react'
import { useModeration } from '../hooks/useModeration'
import Brand from './Brand'

function formatTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间未知'
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function answerTexts(response) {
  return (response.answers || [])
    .map((answer) => (typeof answer === 'string' ? answer : answer?.text))
    .filter(Boolean)
}

export default function ModerationView() {
  const {
    deleteResponse,
    error,
    hasAdminKey,
    loading,
    refresh,
    setResponseHidden,
    snapshot,
  } = useModeration()
  const [filter, setFilter] = useState('active')
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState('')
  const [notice, setNotice] = useState('')

  const responses = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN')
    return [...(snapshot.responses || [])]
      .filter((response) => (filter === 'hidden' ? response.hidden : !response.hidden))
      .filter((response) => (
        !normalizedQuery
        || answerTexts(response).join(' ').toLocaleLowerCase('zh-CN').includes(normalizedQuery)
      ))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [filter, query, snapshot.responses])

  const runAction = async (responseId, action) => {
    setBusyId(responseId)
    setNotice('')
    try {
      await action()
      setNotice('操作成功，词云已实时更新。')
    } catch (nextError) {
      setNotice(nextError.message)
    } finally {
      setBusyId('')
    }
  }

  const handleDelete = (response) => {
    const preview = answerTexts(response).join('、')
    if (!window.confirm(`永久删除“${preview}”？删除后无法恢复。`)) return
    runAction(response.id, () => deleteResponse(response.id))
  }

  return (
    <div className="moderation-shell">
      <header className="moderation-header">
        <Brand compact />
        <span className="moderation-badge">
          词云 {snapshot.question?.variant?.toUpperCase() || '—'} · 管理员
        </span>
      </header>

      <main className="moderation-main">
        <section className="moderation-card">
          <div className="moderation-title-row">
            <div>
              <p className="moderation-kicker">内容审核</p>
              <h1>{snapshot.question?.text || '正在读取问题…'}</h1>
            </div>
            <button type="button" className="moderation-refresh" onClick={() => refresh()} disabled={loading}>
              刷新
            </button>
          </div>

          <div className="moderation-counts" aria-label="回答统计">
            <div><strong>{snapshot.counts?.active || 0}</strong><span>正常显示</span></div>
            <div><strong>{snapshot.counts?.hidden || 0}</strong><span>已屏蔽</span></div>
            <div><strong>{snapshot.counts?.total || 0}</strong><span>全部记录</span></div>
          </div>

          {!hasAdminKey && <div className="moderation-error">请使用终端输出的管理员审核地址打开本页。</div>}
          {error && hasAdminKey && <div className="moderation-error">{error}</div>}

          {hasAdminKey && (
            <>
              <div className="moderation-toolbar">
                <div className="moderation-tabs" role="tablist" aria-label="记录状态">
                  <button
                    type="button"
                    className={filter === 'active' ? 'is-active' : ''}
                    onClick={() => setFilter('active')}
                  >
                    正常记录 · {snapshot.counts?.active || 0}
                  </button>
                  <button
                    type="button"
                    className={filter === 'hidden' ? 'is-active' : ''}
                    onClick={() => setFilter('hidden')}
                  >
                    已屏蔽 · {snapshot.counts?.hidden || 0}
                  </button>
                </div>
                <input
                  aria-label="搜索答案"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索答案内容"
                  type="search"
                  value={query}
                />
              </div>

              {notice && <p className="moderation-notice" aria-live="polite">{notice}</p>}

              <div className="moderation-list" aria-live="polite">
                {loading && !snapshot.responses?.length ? (
                  <div className="moderation-empty">正在读取提交记录…</div>
                ) : responses.length === 0 ? (
                  <div className="moderation-empty">
                    {query ? '没有找到匹配的答案。' : filter === 'hidden' ? '目前没有已屏蔽记录。' : '目前还没有提交记录。'}
                  </div>
                ) : responses.map((response) => (
                  <article className={`moderation-item ${response.hidden ? 'is-hidden' : ''}`} key={response.id}>
                    <div className="moderation-item__meta">
                      <span>{formatTime(response.createdAt)}</span>
                      {response.hidden && <span>已屏蔽</span>}
                    </div>
                    <div className="moderation-item__answers">
                      {answerTexts(response).map((answer) => <span key={answer}>{answer}</span>)}
                    </div>
                    <div className="moderation-item__actions">
                      <button
                        type="button"
                        className={response.hidden ? 'moderation-restore' : 'moderation-hide'}
                        disabled={busyId === response.id}
                        onClick={() => runAction(response.id, () => setResponseHidden(response.id, !response.hidden))}
                      >
                        {busyId === response.id ? '处理中…' : response.hidden ? '恢复显示' : '屏蔽'}
                      </button>
                      <button
                        type="button"
                        className="moderation-delete"
                        disabled={busyId === response.id}
                        onClick={() => handleDelete(response)}
                      >
                        永久删除
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
