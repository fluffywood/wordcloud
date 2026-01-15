import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Custom hook for managing submissions data and real-time updates
 */
export function useSubmissions() {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)

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

  // Set up real-time subscription
  useEffect(() => {
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
          setSubmissions((prev) => [payload.new, ...prev])
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
