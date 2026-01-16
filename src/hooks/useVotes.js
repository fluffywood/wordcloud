import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { getVotedPhrases, addVotedPhrase, hasVotedForPhrase } from '../utils/localStorage'

/**
 * Custom hook for managing votes data and real-time updates
 * Includes debouncing to batch rapid real-time updates
 * Falls back to polling if real-time connection fails
 */
export function useVotes(sessionId) {
  const [votes, setVotes] = useState([])
  const [votedPhrases, setVotedPhrases] = useState([])
  const [loading, setLoading] = useState(true)
  const [isPolling, setIsPolling] = useState(false)

  // Debounce buffer for batching rapid updates
  const pendingUpdatesRef = useRef([])
  const debounceTimerRef = useRef(null)
  const pollingIntervalRef = useRef(null)
  const DEBOUNCE_DELAY = 100 // ms - batch updates within 100ms
  const POLLING_INTERVAL = 10000 // 10 seconds polling fallback

  // Initialize voted phrases from localStorage
  useEffect(() => {
    setVotedPhrases(getVotedPhrases())
  }, [])

  // Fetch votes function (reusable for initial load and polling)
  const fetchVotes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('phrase_votes')
        .select('*')

      if (error) throw error

      setVotes(data || [])
      return { success: true, data }
    } catch (error) {
      console.error('Error fetching votes:', error)
      return { success: false, error }
    }
  }, [])

  // Fetch initial votes
  useEffect(() => {
    async function initialFetch() {
      await fetchVotes()
      setLoading(false)
    }

    initialFetch()
  }, [fetchVotes])

  // Start polling fallback
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return // Already polling

    setIsPolling(true)
    console.log('Starting polling fallback for votes (every 10 seconds)')

    pollingIntervalRef.current = setInterval(() => {
      fetchVotes()
    }, POLLING_INTERVAL)
  }, [fetchVotes])

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
      setIsPolling(false)
      console.log('Stopped polling fallback for votes')
    }
  }, [])

  // Set up real-time subscription with debouncing and fallback polling
  useEffect(() => {
    // Process batched updates
    const processBatchedUpdates = () => {
      if (pendingUpdatesRef.current.length > 0) {
        const updates = [...pendingUpdatesRef.current]
        pendingUpdatesRef.current = []
        setVotes((prev) => [...prev, ...updates])
      }
    }

    const channel = supabase
      .channel('votes-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'phrase_votes',
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
          console.log('Subscribed to votes real-time')
          // Stop polling if real-time is working
          stopPolling()
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error('Real-time subscription error for votes, falling back to polling')
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

  // Check if user has voted for a phrase
  const hasVoted = useCallback((phrase) => {
    return hasVotedForPhrase(phrase)
  }, [])

  // Vote for a phrase
  const voteForPhrase = useCallback(async (phraseText) => {
    // Check localStorage first for instant feedback
    if (hasVotedForPhrase(phraseText)) {
      return { success: false, error: 'Already voted' }
    }

    if (!sessionId) {
      return { success: false, error: 'No session' }
    }

    try {
      const { data, error } = await supabase
        .from('phrase_votes')
        .insert([
          {
            phrase_text: phraseText.toLowerCase(),
            session_id: sessionId,
          },
        ])
        .select()
        .single()

      if (error) {
        // Check if it's a unique constraint violation
        if (error.code === '23505') {
          // Update localStorage to be in sync
          addVotedPhrase(phraseText)
          setVotedPhrases(prev => [...prev, phraseText])
          return { success: false, error: 'Already voted' }
        }
        throw error
      }

      // Update localStorage and state
      addVotedPhrase(phraseText)
      setVotedPhrases(prev => [...prev, phraseText])

      return { success: true, data }
    } catch (error) {
      console.error('Error voting:', error)
      return { success: false, error: error.message }
    }
  }, [sessionId])

  return {
    votes,
    votedPhrases,
    loading,
    voteForPhrase,
    hasVoted,
    isPolling, // Expose polling status for debugging/UI
  }
}
