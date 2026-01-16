/**
 * Client-side profanity filter
 * Blocks submissions containing inappropriate words
 */

// Curated list of profanity and variations
const PROFANITY_LIST = [
  // Common profanity (with variations)
  'fuck', 'f*ck', 'f**k', 'fck', 'fuk', 'fvck', 'fucc', 'phuck', 'phuk',
  'shit', 'sh*t', 'sh1t', 'sht', 'shlt', 'schit',
  'ass', 'a$$', '@ss',
  'bitch', 'b*tch', 'b1tch', 'biatch',
  'damn', 'd*mn', 'dmn',
  'hell', // only when used as profanity
  'crap',
  'dick', 'd*ck', 'd1ck',
  'cock', 'c*ck', 'c0ck',
  'pussy', 'p*ssy', 'pu$$y',
  'cunt', 'c*nt', 'cvnt',
  'whore', 'wh*re', 'h0e', 'hoe',
  'slut', 'sl*t',
  'bastard', 'b*stard',
  'piss', 'p*ss',

  // Slurs and hate speech (abbreviated/partial for detection)
  'nigger', 'n*gger', 'n1gger', 'nigg', 'n*gg',
  'nigga', 'n*gga',
  'faggot', 'f*ggot', 'fag', 'f*g',
  'retard', 'r*tard', 'retrd',
  'kike', 'k*ke',
  'spic', 'sp*c',
  'chink', 'ch*nk',
  'wetback',
  'beaner',

  // Sexual terms
  'porn', 'p*rn', 'pron',
  'xxx',
  'sex', // context dependent, but safer to flag
  'nude', 'nudes',
  'naked',
  'horny', 'h*rny',
  'dildo',
  'vibrator',
  'masturbat',
  'jerkoff', 'jerk off',
  'blowjob', 'blow job',
  'handjob', 'hand job',
  'cumshot', 'cum shot', 'cum',
  'orgasm',
  'erection',
  'penis', 'pen*s',
  'vagina', 'vag*na',
  'boobs', 'boob', 'b00bs', 'tits', 't*ts', 'titties',

  // Violence
  'kill', // might be too restrictive for gaming context
  'murder',
  'rape', 'r*pe',
  'suicide',

  // Drugs (common inappropriate references)
  'cocaine', 'coke',
  'heroin',
  'meth',
  'weed', // context dependent
  'marijuana',
]

// Create regex patterns for each word (case-insensitive, word boundary aware)
const profanityPatterns = PROFANITY_LIST.map(word => {
  // First, handle asterisks in the profanity list by replacing them with a placeholder
  // Then escape special regex characters, then convert placeholder to character class
  const placeholder = '___STAR___'
  const withPlaceholder = word.replace(/\*/g, placeholder)
  // Escape special regex characters
  const escaped = withPlaceholder.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
  // Replace placeholder with pattern that matches: letter, number, or common substitution symbols
  const pattern = escaped.replace(new RegExp(placeholder, 'g'), '[a-z0-9*@$!]')
  return new RegExp(`\\b${pattern}\\b`, 'i')
})

/**
 * Check if text contains profanity
 * @param {string} text - Text to check
 * @returns {boolean} - True if profanity detected
 */
export function containsProfanity(text) {
  if (!text || typeof text !== 'string') return false

  // Normalize text
  const normalized = text.toLowerCase()

  // Check against all patterns
  for (const pattern of profanityPatterns) {
    if (pattern.test(normalized)) {
      return true
    }
  }

  return false
}

/**
 * Get error message for profanity detection
 * @returns {string} - User-friendly error message
 */
export function getProfanityErrorMessage() {
  return "Please keep submissions appropriate for a public stream"
}
