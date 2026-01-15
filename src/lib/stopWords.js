/**
 * Common English stop words to filter out during phrase extraction.
 * These words are too common to be meaningful in a word cloud.
 */
export const STOP_WORDS = new Set([
  // Articles
  'a', 'an', 'the',

  // Pronouns
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
  'you', 'your', 'yours', 'yourself', 'yourselves',
  'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',

  // Verbs (common forms)
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
  'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall',
  'can', 'need', 'dare', 'ought', 'used',

  // Prepositions
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
  'up', 'about', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'between', 'under', 'again', 'further',
  'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',

  // Conjunctions
  'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither',
  'not', 'only', 'own', 'same', 'than', 'too', 'very',

  // Other common words
  'if', 'because', 'as', 'until', 'while', 'although',
  'all', 'any', 'each', 'every', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'just', 'also', 'now', 'even',

  // Common filler words
  'get', 'got', 'like', 'make', 'made', 'want', 'wanted',
  'thing', 'things', 'something', 'anything', 'everything', 'nothing',
  'someone', 'anyone', 'everyone', 'one', 'ones',

  // Tech-specific common words that are too generic
  'use', 'using', 'uses', 'used',
])

/**
 * Check if a word is a stop word
 * @param {string} word - The word to check (should be lowercase)
 * @returns {boolean} - True if the word is a stop word
 */
export function isStopWord(word) {
  return STOP_WORDS.has(word.toLowerCase())
}
