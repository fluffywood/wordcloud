import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Custom hook for managing submissions data and real-time updates
 * Includes debouncing to batch rapid real-time updates
 */
export function useSubmissions() {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)

  // Debounce buffer for batching rapid updates
  const pendingUpdatesRef = useRef([])
  const debounceTimerRef = useRef(null)
  const DEBOUNCE_DELAY = 100 // ms - batch updates within 100ms

  // Fetch initial submissions
  useEffect(() => {
    async function fetchSubmissions() {
      try {
        const { data, error } = await supabase
          .from('submissions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500)

        if (error) throw error

        setSubmissions(data || [])
      } catch (error) {
        console.error('Error fetching submissions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSubmissions()
  }, [])

  // Set up real-time subscription with debouncing
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
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('Real-time subscription error for submissions')
        }
      })

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      supabase.removeChannel(channel)
    }
  }, [])

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
  }
}
