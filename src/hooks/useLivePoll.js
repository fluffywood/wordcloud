import { useCallback, useEffect, useMemo, useState } from 'react'
import { aggregateAnswers } from '../lib/aggregateAnswers'

const EMPTY_STATE = {
  question: null,
  responses: [],
  joinUrl: '',
  ownResponse: null,
}

let memorySessionId = ''

function readStorage(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Some private browsing policies disable storage. In-memory state still works.
  }
}

function getSessionId() {
  const storageKey = 'wordflow_session_id'
  const existing = readStorage(storageKey) || memorySessionId
  if (existing) return existing

  const id = globalThis.crypto?.randomUUID?.()
    || `participant-${Date.now()}-${Math.random().toString(36).slice(2)}`
  memorySessionId = id
  writeStorage(storageKey, id)
  return id
}

function getAdminKey() {
  const params = new URLSearchParams(window.location.search)
  const keyFromUrl = params.get('admin')
  if (keyFromUrl) {
    writeStorage('wordflow_admin_key', keyFromUrl)
    params.delete('admin')
    const query = params.toString()
    try {
      history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`)
    } catch {
      // The key is still available for this page load if history access is restricted.
    }
    return keyFromUrl
  }
  return readStorage('wordflow_admin_key') || ''
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error || '请求失败，请稍后重试')
    error.code = payload.code
    error.status = response.status
    error.payload = payload
    throw error
  }
  return payload
}

export function useLivePoll() {
  const [poll, setPoll] = useState(EMPTY_STATE)
  const [loading, setLoading] = useState(true)
  const [connection, setConnection] = useState('connecting')
  const [error, setError] = useState('')
  const [sessionId] = useState(getSessionId)
  const [adminKey] = useState(getAdminKey)

  useEffect(() => {
    let active = true
    let pollingTimer
    const stateUrl = `/api/state?sessionId=${encodeURIComponent(sessionId)}`

    const refreshState = () => request(stateUrl)
      .then((nextState) => {
        if (!active) return
        setPoll(nextState)
        setError('')
      })
      .catch((nextError) => {
        if (!active) return
        setError(nextError.message)
        setConnection('offline')
      })

    refreshState()
      .finally(() => {
        if (active) setLoading(false)
      })

    const eventSource = new EventSource(`/api/events?sessionId=${encodeURIComponent(sessionId)}`)
    eventSource.addEventListener('state', (event) => {
      if (!active) return
      try {
        setPoll(JSON.parse(event.data))
        setConnection('live')
        setError('')
        setLoading(false)
        if (pollingTimer) {
          clearInterval(pollingTimer)
          pollingTimer = undefined
        }
      } catch {
        setConnection('offline')
      }
    })
    eventSource.onopen = () => active && setConnection('live')
    eventSource.onerror = () => {
      if (!active) return
      setConnection('reconnecting')
      if (!pollingTimer) pollingTimer = setInterval(refreshState, 8000)
    }

    return () => {
      active = false
      if (pollingTimer) clearInterval(pollingTimer)
      eventSource.close()
    }
  }, [sessionId])

  const submitAnswer = useCallback(async ({ selectedOptions, otherText }) => {
    try {
      const payload = await request('/api/responses', {
        method: 'POST',
        body: JSON.stringify({ selectedOptions, otherText, sessionId, questionId: poll.question?.id }),
      })
      if (payload.state) setPoll(payload.state)
      return payload
    } catch (nextError) {
      if (nextError.payload?.state) setPoll(nextError.payload.state)
      throw nextError
    }
  }, [poll.question?.id, sessionId])

  const clearResponses = useCallback(async () => {
    const nextState = await request(`/api/responses?sessionId=${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
      headers: adminKey ? { 'X-Admin-Key': adminKey } : {},
    })
    setPoll(nextState)
    return nextState
  }, [adminKey, sessionId])

  const aggregates = useMemo(() => aggregateAnswers(poll.responses), [poll.responses])

  const hasSubmitted = Boolean(poll.ownResponse)

  return {
    ...poll,
    aggregates,
    adminKey,
    clearResponses,
    connection,
    error,
    hasSubmitted,
    loading,
    ownResponse: poll.ownResponse,
    sessionId,
    submitAnswer,
  }
}
