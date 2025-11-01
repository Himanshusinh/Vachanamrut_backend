/**
 * Normalize question text for comparison and matching
 * @param {string} q - Question string
 * @returns {string} Normalized question
 */
function normalizeQuestion(q) {
  return String(q || '')
    .normalize('NFKC')
    .replace(/[\u0964\u0965\u0A83\u0ABD\u0AE0\u0AE1\u0AF0\u0AF1]/g, ' ')
    .replace(/[\u0A80-\u0AFF]/g, ch => ch)
    .replace(/[\p{P}\p{S}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Sanitize base64 string by removing data URI prefix and padding
 * @param {string} b64 - Base64 string
 * @returns {string} Sanitized base64 string
 */
function sanitizeBase64(b64) {
  let s = String(b64 || '').trim();
  if (s.startsWith('data:')) {
    const commaIdx = s.indexOf(',');
    if (commaIdx >= 0) s = s.slice(commaIdx + 1);
  }
  s = s.replace(/[^A-Za-z0-9+/=]/g, '');
  const mod = s.length % 4;
  if (mod === 2) s += '==';
  else if (mod === 3) s += '=';
  return s;
}

/**
 * Calculate similarity between two strings (0.0 to 1.0)
 * Uses a combination of word overlap and string similarity
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score between 0.0 and 1.0
 */
function calculateSimilarity(str1, str2) {
  const s1 = normalizeQuestion(str1);
  const s2 = normalizeQuestion(str2);
  
  // Exact match
  if (s1 === s2) return 1.0;
  
  // Word-based similarity (Jaccard similarity)
  const words1 = new Set(s1.split(/\s+/).filter(w => w.length > 0));
  const words2 = new Set(s2.split(/\s+/).filter(w => w.length > 0));
  
  if (words1.size === 0 || words2.size === 0) return 0.0;
  
  // Calculate intersection and union
  let intersection = 0;
  words1.forEach(word => {
    if (words2.has(word)) intersection++;
  });
  
  const union = words1.size + words2.size - intersection;
  const wordSimilarity = intersection / union;
  
  // Character-based similarity (for partial word matches)
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  // Check if shorter string is a substring of longer
  if (longer.includes(shorter)) {
    const substringSimilarity = shorter.length / longer.length;
    // Combine word and substring similarity
    return Math.max(wordSimilarity, substringSimilarity * 0.9);
  }
  
  // Calculate Levenshtein-like similarity (simplified)
  let matchingChars = 0;
  const minLen = Math.min(s1.length, s2.length);
  const maxLen = Math.max(s1.length, s2.length);
  
  for (let i = 0; i < minLen; i++) {
    if (s1[i] === s2[i]) matchingChars++;
  }
  
  const charSimilarity = matchingChars / maxLen;
  
  // Combine word similarity (70%) and character similarity (30%)
  return (wordSimilarity * 0.7) + (charSimilarity * 0.3);
}

module.exports = { normalizeQuestion, sanitizeBase64, calculateSimilarity };

