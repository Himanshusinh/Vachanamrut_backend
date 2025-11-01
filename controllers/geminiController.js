/**
 * Controller for Gemini API endpoints
 */
const { callGemini } = require('../services/geminiService');
const historyService = require('../services/historyService');

/**
 * POST /api/gemini
 * Get AI response for a question (checks history first)
 */
async function postGemini(req, res) {
  const timestamp = new Date().toISOString();
  try {
    const { query } = req.body || {};
    if (!query) {
      console.log(`[${timestamp}] ❌ POST /api/gemini - Missing query`);
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log(`[${timestamp}] 📝 POST /api/gemini - Question received: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`);
    
    // First, check if this question (or similar question 80-90% match) was asked before
    console.log(`[${timestamp}] 🔍 Checking history for cached or similar answer (80-90% similarity)...`);
    const cachedResult = await historyService.findHistory(query, 0.8);
    
    if (cachedResult.found) {
      const similarityPercent = Math.round((cachedResult.similarity || 1.0) * 100);
      const matchType = cachedResult.exactMatch ? 'exact' : 'similar';
      console.log(`[${timestamp}] ✅ POST /api/gemini - Found ${matchType} answer in history (${similarityPercent}% match)!`);
      console.log(`[${timestamp}] 📄 Using cached answer (${cachedResult.answer.length} chars)`);
      console.log(`[${timestamp}] 🔊 Found ${cachedResult.ttsParts?.length || 0} audio parts in cache`);
      console.log(`[${timestamp}] ⚡ No API call needed - returning from cache`);
      
      return res.json({
        answer: cachedResult.answer,
        fromCache: true,
        ttsParts: cachedResult.ttsParts || [],
        similarity: cachedResult.similarity,
        matchType: matchType
      });
    }
    
    // Not in cache, call Gemini API
    console.log(`[${timestamp}] ℹ️  No cached answer found - calling Gemini API...`);
    console.log(`[${timestamp}] 🤖 Making API call to Gemini...`);
    
    const answer = await callGemini(query);
    
    console.log(`[${timestamp}] ✅ POST /api/gemini - Answer generated (${answer.length} chars)`);
    console.log(`[${timestamp}] 📄 Answer preview: "${answer.substring(0, 150)}${answer.length > 150 ? '...' : ''}"`);
    console.log(`[${timestamp}] 💾 Answer will be saved to history after TTS generation`);
    
    return res.json({
      answer,
      fromCache: false
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error(`[${timestamp}] ❌ POST /api/gemini - Error: ${msg}`);
    const statusCode = msg.includes('API key') ? 500 : msg.includes('Gemini API') ? 502 : 500;
    return res.status(statusCode).json({ error: `Internal server error: ${msg}` });
  }
}

module.exports = { postGemini };

