import { useEffect, useMemo, useState } from 'react'
import {
  OTHER_MAX_LENGTH,
  OTHER_OPTION,
  POLL_OPTIONS,
} from '../config/pollConfig'
import { countGraphemes, limitGraphemes } from '../lib/text'
import Brand from './Brand'
import ConnectionBadge from './ConnectionBadge'

function responseAnswerTexts(response) {
  if (Array.isArray(response?.answers)) {
    return response.answers
      .map((answer) => (typeof answer === 'string' ? answer : answer?.text))
      .filter(Boolean)
  }
  return response?.text ? [response.text] : []
}

export default function ParticipantView({ livePoll }) {
  const {
    connection,
    error: connectionError,
    hasSubmitted,
    loading,
    ownResponse,
    question,
    responses,
    submitAnswer,
  } = livePoll
  const [selectedOptions, setSelectedOptions] = useState([])
  const [otherText, setOtherText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const questionReady = Boolean(question?.id && question?.text)
  const options = Array.isArray(question?.options) && question.options.length
    ? question.options
    : POLL_OPTIONS
  const otherMaxLength = question?.otherMaxLength || OTHER_MAX_LENGTH
  const hasOtherSelected = selectedOptions.includes(OTHER_OPTION)
  const submittedAnswers = useMemo(() => responseAnswerTexts(ownResponse), [ownResponse])
  const canSubmit = selectedOptions.length > 0 && (!hasOtherSelected || otherText.trim())

  useEffect(() => {
    setSelectedOptions([])
    setOtherText('')
    setError('')
  }, [question?.id])

  const toggleOption = (option, checked) => {
    setSelectedOptions((current) => (
      checked ? [...current, option] : current.filter((item) => item !== option)
    ))
    if (option === OTHER_OPTION && !checked) setOtherText('')
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (selectedOptions.length === 0) {
      setError('请至少选择一种心情')
      return
    }
    if (hasOtherSelected && !otherText.trim()) {
      setError('请写下你的其他心情')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await submitAnswer({ selectedOptions, otherText })
      setSelectedOptions([])
      setOtherText('')
    } catch (nextError) {
      setError(nextError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="participant-shell">
      <div className="participant-orb participant-orb--one" />
      <div className="participant-orb participant-orb--two" />

      <header className="participant-header">
        <Brand compact />
        <ConnectionBadge connection={connection} />
      </header>

      <main className="participant-main">
        <section className="participant-card">
          <div className="participant-card__topline">
            <span>LIVE QUESTION</span>
            <span className="response-chip"><i /> {responses.length} 人已回答</span>
          </div>

          {loading ? <div className="mobile-question-skeleton" /> : <h1>{question?.text}</h1>}
          <p className="participant-prompt">可多选；选择“其他”可以写下自己的词</p>

          {!loading && !questionReady && (
            <div className="participant-error" role="alert">暂时无法读取问题，请检查网络后刷新页面。</div>
          )}
          {hasSubmitted && connectionError && (
            <div className="participant-error" role="alert">{connectionError}</div>
          )}

          {hasSubmitted ? (
            <div className="success-state">
              <div className="success-state__icon">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
              </div>
              <span className="success-state__eyebrow">提交成功</span>
              <h2>谢谢你的回答</h2>
              <div className="answer-receipt">
                {submittedAnswers.map((answer) => <span key={answer}>{answer}</span>)}
              </div>
              <p>你选择的心情已经出现在大屏词云中</p>
              <div className="waiting-pill"><i /> 本轮已完成</div>
            </div>
          ) : (
            <form className="answer-form" onSubmit={handleSubmit}>
              <fieldset className="choice-fieldset" disabled={submitting || loading || !questionReady}>
                <legend>
                  <span>选择你的心情</span>
                  <small>可多选</small>
                </legend>
                <div className="choice-grid">
                  {options.map((option) => {
                    const selected = selectedOptions.includes(option)
                    return (
                      <label className={`choice-option ${selected ? 'choice-option--selected' : ''}`} key={option}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(event) => toggleOption(option, event.target.checked)}
                          value={option}
                        />
                        <span className="choice-option__text">{option}</span>
                        <span className="choice-option__check" aria-hidden="true">✓</span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>

              {hasOtherSelected && (
                <label className="other-answer" htmlFor="other-answer">
                  <span>其他心情</span>
                  <div className={`answer-input-wrap ${error && !otherText.trim() ? 'answer-input-wrap--error' : ''}`}>
                    <input
                      id="other-answer"
                      autoComplete="off"
                      autoFocus
                      disabled={submitting || loading || !questionReady}
                      onChange={(event) => {
                        setOtherText(limitGraphemes(event.target.value, otherMaxLength))
                        setError('')
                      }}
                      placeholder="输入不超过 6 个字"
                      value={otherText}
                    />
                    <span>{countGraphemes(otherText)}/{otherMaxLength}</span>
                  </div>
                </label>
              )}

              {(error || connectionError) && <p className="field-error" role="alert">{error || connectionError}</p>}
              <button
                className="submit-answer"
                type="submit"
                disabled={submitting || loading || !questionReady || !canSubmit}
              >
                <span>{submitting ? '正在提交…' : `提交答案${selectedOptions.length ? ` · ${selectedOptions.length}` : ''}`}</span>
                {!submitting && <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 14-7-4 14-3-6-7-1Zm7 1 7-8" /></svg>}
              </button>
              <div className="privacy-note">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2m-11 0h12v10H6V10Z" /></svg>
                无需登录 · 匿名参与 · 每人限答一次
              </div>
            </form>
          )}
        </section>

        <p className="participant-footer">POWERED BY <strong>WORDFLOW</strong></p>
      </main>
    </div>
  )
}
