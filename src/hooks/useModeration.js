import { useCallback, useEffect, useState } from 'react'

const EMPTY_STATE = {
  question: null,
  counts: { active: 0, hidden: 0, total: 0 },
  responses: [],
}

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
    // Private browsing may block storage; the current page still keeps the key in memory.
  }
}

function getAdminKey() {
  const params = new URLSearchParams(window.location.search)
  const keyFromUrl = params.get('admin')
  if (!keyFromUrl) return readStorage('wordflow_admin_key') || ''

  writeStorage('wordflow_admin_key', keyFromUrl)
  params.delete('admin')
  const query = params.toString()
  try {
    history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`)
  } catch {
    // The key remains available for this page load if history access is restricted.
  }
  return keyFromUrl
}

async function adminRequest(path, adminKey, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': adminKey,
      ...options.headers,
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(
      response.status === 401
        ? '管理员密钥无效，请使用终端输出的手机审核地址重新打开本页。'
        : payload.error || '管理操作失败，请稍后重试。',
    )
    error.status = response.status
    throw error
  }
  return payload
}

export function useModeration() {
  const [adminKey] = useState(getAdminKey)
  const [snapshot, setSnapshot] = useState(EMPTY_STATE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!adminKey) {
      setLoading(false)
      setError('没有管理员权限，请使用服务启动终端输出的手机审核地址打开本页。')
      return null
    }
    try {
      const nextSnapshot = await adminRequest('/api/admin/responses', adminKey)
      setSnapshot(nextSnapshot)
      setError('')
      return nextSnapshot
    } catch (nextError) {
      if (!quiet || nextError.status === 401) setError(nextError.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [adminKey])

  useEffect(() => {
    refresh()
    const timer = window.setInterval(() => refresh({ quiet: true }), 2500)
    return () => window.clearInterval(timer)
  }, [refresh])

  const setResponseHidden = useCallback(async (responseId, hidden) => {
    const nextSnapshot = await adminRequest(
      `/api/admin/responses/${encodeURIComponent(responseId)}`,
      adminKey,
      { method: 'PATCH', body: JSON.stringify({ hidden }) },
    )
    setSnapshot(nextSnapshot)
    setError('')
    return nextSnapshot
  }, [adminKey])

  const deleteResponse = useCallback(async (responseId) => {
    const nextSnapshot = await adminRequest(
      `/api/admin/responses/${encodeURIComponent(responseId)}`,
      adminKey,
      { method: 'DELETE' },
    )
    setSnapshot(nextSnapshot)
    setError('')
    return nextSnapshot
  }, [adminKey])

  return {
    deleteResponse,
    error,
    hasAdminKey: Boolean(adminKey),
    loading,
    refresh,
    setResponseHidden,
    snapshot,
  }
}
