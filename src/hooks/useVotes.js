import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { getVotedPhrases, addVotedPhrase, hasVotedForPhrase } from '../utils/localStorage'

/**
 * Custom hook for managing votes data and real-time updates
 * Includes debouncing to batch rapid real-time updates
 */
export function useVotes(sessionId) {
  const [votes, setVotes] = useState([])
  const [votedPhrases, setVotedPhrases] = useState([])
  const [loading, setLoading] = useState(true)

  // Debounce buffer for batching rapid updates
  const pendingUpdatesRef = useRef([])
  const debounceTimerRef = useRef(null)
  const DEBOUNCE_DELAY = 100 // ms - batch updates within 100ms

  // Initialize voted phrases from localStorage
  useEffect(() => {
    setVotedPhrases(getVotedPhrases())
  }, [])

  // Fetch initial votes
  useEffect(() => {
    async function fetchVotes() {
      try {
        const { data, error } = await supabase
          .from('phrase_votes')
          .select('*')

        if (error) throw error

        setVotes(data || [])
      } catch (error) {
        console.error('Error fetching votes:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchVotes()
  }, [])

  // Set up real-time subscription with debouncing
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
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('Real-time subscription error for votes')
        }
      })

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      supabase.removeChannel(channel)
    }
  }, [])

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
  }
}
