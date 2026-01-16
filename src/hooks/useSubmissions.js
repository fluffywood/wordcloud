import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Custom hook for managing submissions data and real-time updates
 * Includes debouncing to batch rapid real-time updates
 * Falls back to polling if real-time connection fails
 */
export function useSubmissions() {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [isPolling, setIsPolling] = useState(false)

  // Debounce buffer for batching rapid updates
  const pendingUpdatesRef = useRef([])
  const debounceTimerRef = useRef(null)
  const pollingIntervalRef = useRef(null)
  const lastFetchRef = useRef(null)
  const DEBOUNCE_DELAY = 100 // ms - batch updates within 100ms
  const POLLING_INTERVAL = 10000 // 10 seconds polling fallback

  // Fetch submissions function (reusable for initial load and polling)
  const fetchSubmissions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) throw error

      setSubmissions(data || [])
      lastFetchRef.current = new Date()
      return { success: true, data }
    } catch (error) {
      console.error('Error fetching submissions:', error)
      return { success: false, error }
    }
  }, [])

  // Fetch initial submissions
  useEffect(() => {
    async function initialFetch() {
      await fetchSubmissions()
      setLoading(false)
    }

    initialFetch()
  }, [fetchSubmissions])

  // Start polling fallback
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return // Already polling

    setIsPolling(true)
    console.log('Starting polling fallback for submissions (every 10 seconds)')

    pollingIntervalRef.current = setInterval(() => {
      fetchSubmissions()
    }, POLLING_INTERVAL)
  }, [fetchSubmissions])

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
      setIsPolling(false)
      console.log('Stopped polling fallback for submissions')
    }
  }, [])

  // Set up real-time subscription with debouncing and fallback polling
  useEffect(() => {
    // Process batched updates
    const processBatchedUpdates = () => {
      if (pendingUpdatesRef.current.length > 0) {
        const updates = [...pendingUpdatesRef.current]
        pendingUpdatesRef.current = []
        setSubmissions((prev) => [...updates, ...prev])
      }
    }

    const channel = supabase
      .channel('submissions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'submissions',
        },
        (payload) => {
          // Real-time is working, stop polling if active
          if (pollingIntervalRef.current) {
            stopPolling()
          }

          // Add to pending updates buffer
          pendingUpdatesRef.current.push(payload.new)

          // Clear existing timer and set new one (debounce)
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
          }
          debounceTimerRef.current = setTimeout(processBatchedUpdates, DEBOUNCE_DELAY)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to submissions real-time')
          // Stop polling if real-time is working
          stopPolling()
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error('Real-time subscription error for submissions, falling back to polling')
          // Start polling fallback
          startPolling()
        }
      })

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      stopPolling()
      supabase.removeChannel(channel)
    }
  }, [startPolling, stopPolling])

  // Add a new submission
  const addSubmission = useCallback(async (text, sessionId) => {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .insert([
          {
            text: text.trim(),
            session_id: sessionId,
          },
        ])
        .select()
        .single()

      if (error) throw error

      // Note: Real-time subscription will add this to state
      return { success: true, data }
    } catch (error) {
      console.error('Error adding submission:', error)
      return { success: false, error: error.message }
    }
  }, [])

  return {
    submissions,
    loading,
    addSubmission,
    isPolling, // Expose polling status for debugging/UI
  }
}
