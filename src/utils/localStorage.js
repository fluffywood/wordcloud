/**
 * LocalStorage utility functions for session management
 */

const KEYS = {
  SESSION_ID: 'wordcloud_session_id',
  LAST_SUBMISSION: 'wordcloud_last_submission',
  VOTED_PHRASES: 'wordcloud_voted_phrases',
}

/**
 * Get a value from localStorage
 * @param {string} key - Storage key
 * @returns {string|null} - Stored value or null
 */
export function getItem(key) {
  try {
    return localStorage.getItem(key)
  } catch (error) {
    console.error('Error reading from localStorage:', error)
    return null
  }
}

/**
 * Set a value in localStorage
 * @param {string} key - Storage key
 * @param {string} value - Value to store
 */
export function setItem(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch (error) {
    console.error('Error writing to localStorage:', error)
  }
}

/**
 * Remove a value from localStorage
 * @param {string} key - Storage key
 */
export function removeItem(key) {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Error removing from localStorage:', error)
  }
}

/**
 * Get or generate session ID
 * @param {function} generateId - Function to generate new ID
 * @returns {string} - Session ID
 */
export function getOrCreateSessionId(generateId) {
  let sessionId = getItem(KEYS.SESSION_ID)

  if (!sessionId) {
    sessionId = generateId()
    setItem(KEYS.SESSION_ID, sessionId)
  }

  return sessionId
}

/**
 * Get last submission timestamp
 * @returns {number|null} - Timestamp or null
 */
export function getLastSubmissionTime() {
  const timestamp = getItem(KEYS.LAST_SUBMISSION)
  return timestamp ? parseInt(timestamp, 10) : null
}

/**
 * Set last submission timestamp to now
 */
export function setLastSubmissionTime() {
  setItem(KEYS.LAST_SUBMISSION, Date.now().toString())
}

/**
 * Get voted phrases array
 * @returns {string[]} - Array of voted phrase texts
 */
export function getVotedPhrases() {
  const stored = getItem(KEYS.VOTED_PHRASES)
  if (!stored) return []

  try {
    return JSON.parse(stored)
  } catch {
    return []
  }
}

/**
 * Add a phrase to voted list
 * @param {string} phrase - Phrase text
 */
export function addVotedPhrase(phrase) {
  const voted = getVotedPhrases()
  if (!voted.includes(phrase)) {
    voted.push(phrase)
    setItem(KEYS.VOTED_PHRASES, JSON.stringify(voted))
  }
}

/**
 * Check if a phrase has been voted on
 * @param {string} phrase - Phrase text
 * @returns {boolean} - True if voted
 */
export function hasVotedForPhrase(phrase) {
  return getVotedPhrases().includes(phrase)
}

/**
 * Clear all wordcloud-related localStorage
 */
export function clearAllStorage() {
  removeItem(KEYS.SESSION_ID)
  removeItem(KEYS.LAST_SUBMISSION)
  removeItem(KEYS.VOTED_PHRASES)
}

export { KEYS }
