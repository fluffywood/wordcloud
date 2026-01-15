import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getVotedPhrases, addVotedPhrase, hasVotedForPhrase } from '../utils/localStorage'
import toast from 'react-hot-toast'

/**
 * Custom hook for managing votes data and real-time updates
 */
export function useVotes(sessionId) {
  const [votes, setVotes] = useState([])
  const [votedPhrases, setVotedPhrases] = useState([])
  const [loading, setLoading] = useState(true)

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
        toast.error('Failed to load votes')
      } finally {
        setLoading(false)
      }
    }

    fetchVotes()
  }, [])

  // Set up real-time subscription
  useEffect(() => {
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
          setVotes((prev) => [...prev, payload.new])
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
      toast.error('You already voted for this!')
      return { success: false, error: 'Already voted' }
    }

    if (!sessionId) {
      toast.error('Session not initialized')
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
          toast.error('You already voted for this!')
          return { success: false, error: 'Already voted' }
        }
        throw error
      }

      // Update localStorage and state
      addVotedPhrase(phraseText)
      setVotedPhrases(prev => [...prev, phraseText])
      toast.success('Vote recorded!')

      return { success: true, data }
    } catch (error) {
      console.error('Error voting:', error)
      toast.error('Failed to record vote')
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
