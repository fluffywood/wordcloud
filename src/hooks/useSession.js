import { useState, useCallback, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { getOrCreateSessionId, clearAllStorage } from '../utils/localStorage'

/**
 * Custom hook for managing user session
 * Generates and persists a UUID for the session
 */
export function useSession() {
  const [sessionId, setSessionId] = useState('')

  // Initialize session on mount
  useEffect(() => {
    const id = getOrCreateSessionId(uuidv4)
    setSessionId(id)
  }, [])

  // Reset session (generate new ID, clear all storage)
  const resetSession = useCallback(() => {
    clearAllStorage()
    const newId = uuidv4()
    setSessionId(newId)
    // The new ID will be persisted on next getOrCreateSessionId call
    localStorage.setItem('wordcloud_session_id', newId)
  }, [])

  return {
    sessionId,
    resetSession,
  }
}
