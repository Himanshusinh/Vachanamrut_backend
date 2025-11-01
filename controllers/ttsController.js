/**
 * Controller for Text-to-Speech API endpoints
 */
const { callTts } = require('../services/geminiService');

/**
 * POST /api/tts
 * Generate text-to-speech audio
 */
async function postTts(req, res) {
  const timestamp = new Date().toISOString();
  try {
    const { text } = req.body || {};
    if (!text) {
      console.log(`[${timestamp}] ❌ POST /api/tts - Missing text`);
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log(`[${timestamp}] 🔊 POST /api/tts - Text to convert (${text.length} chars): "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
    console.log(`[${timestamp}] 🎤 Calling Gemini TTS API...`);
    
    const { audio, mimeType, originalMimeType } = await callTts(text);
    
    console.log(`[${timestamp}] ✅ POST /api/tts - Audio generated successfully`);
    console.log(`[${timestamp}] 📊 Audio info: mimeType=${mimeType}, originalMimeType=${originalMimeType}, size=${audio.length} chars (base64)`);
    
    return res.json({ audio, mimeType, originalMimeType });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error';
    console.error(`[${timestamp}] ❌ POST /api/tts - Error: ${msg}`);
    if (e.status === 429 || msg.includes('Failed to generate speech')) {
      console.error(`[${timestamp}] ⏳ Rate limit hit, retry after: ${e.retryAfterMs}ms`);
      return res.status(429).json({
        error: 'Failed to generate speech',
        status: e.status || 429,
        retryAfterMs: e.retryAfterMs
      });
    }
    return res.status(500).json({ error: msg });
  }
}

module.exports = { postTts };

