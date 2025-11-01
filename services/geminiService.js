/**
 * Service for interacting with Google Gemini API
 */

/**
 * Call Gemini API to generate text response
 * @param {string} query - User question
 * @returns {Promise<string>} Generated answer
 */
async function callGemini(query) {
  const timestamp = new Date().toISOString();
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.error(`[${timestamp}] ❌ Gemini Service - API key not configured`);
    throw new Error('API key not configured');
  }
  
  console.log(`[${timestamp}] 🌐 Gemini Service - Making API call to Gemini...`);

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a knowledgeable assistant specializing ONLY in the Vachanamrut, a sacred Hindu scripture containing the teachings of Bhagwan Swaminarayan.

The Vachanamrut is a collection of 273 spiritual discourses given by Bhagwan Swaminarayan between 1819 and 1829. It covers topics like dharma, bhakti, moksha, the nature of God, and spiritual practices.

CRITICAL INSTRUCTIONS:
1. ONLY answer questions that are directly related to the Vachanamrut scripture, its teachings, Bhagwan Swaminarayan, or topics covered in the Vachanamrut.

2. If a question is NOT about the Vachanamrut, you MUST politely decline and redirect. Use responses like:
   - In English: "I apologize, but I can only answer questions about the Vachanamrut scripture. Please ask me about the teachings of Bhagwan Swaminarayan or topics from the Vachanamrut."
   - In Gujarati: "માફ કરશો, પરંતુ હું ફક્ત વચનામૃત વિશેના પ્રશ્નોના જવાબ આપી શકું છું. કૃપા કરીને મને ભગવાન સ્વામિનારાયણના ઉપદેશો અથવા વચનામૃતમાંથી પ્રશ્નો પૂછો."

3. Topics that ARE acceptable: Vachanamrut content, Bhagwan Swaminarayan's life and teachings, dharma, bhakti, moksha, spiritual practices mentioned in Vachanamrut, satsang, and related spiritual concepts.

4. Topics that are NOT acceptable: General knowledge, current events, other religious texts, science, technology, entertainment, or anything not related to Vachanamrut.

5. Language matching:
   - If the question is in English, respond in English
   - If the question is in Gujarati, respond in Gujarati

6. Be respectful and reverent when discussing the Vachanamrut teachings.

7. Response quality and length policy (completeness first):
   - Provide a complete, high-quality answer that directly addresses the question.
   - Default to short/medium length (about 80–180 words) when sufficient.
   - If the topic requires depth for correctness or the user implicitly asks for detail, write a longer answer. Do not omit crucial context.
   - Prefer clear structure: start with a direct answer, then 2–5 concise bullet points elaborating, and end with a one-line takeaway.
   - If you can cite a specific Vachanamrut (e.g., Gadhada I-10), include it; otherwise, do not fabricate citations.

8. When unsure, say "I'm not completely sure from Vachanamrut alone" and ask for clarification rather than refusing. Do not hallucinate citations.

Question: ${query}`
              }
            ]
          }
        ],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024, candidateCount: 1 }
      })
    }
  );

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`[${timestamp}] ❌ Gemini Service - API error (${resp.status}): ${errText}`);
    throw new Error(`Gemini API error: ${errText}`);
  }

  const data = await resp.json();
  const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
  console.log(`[${timestamp}] ✅ Gemini Service - Received answer (${answer.length} characters)`);
  return answer;
}

/**
 * Call Gemini TTS API to generate speech audio
 * @param {string} text - Text to convert to speech
 * @returns {Promise<{audio: string, mimeType: string, originalMimeType: string}>} Audio data
 */
async function callTts(text) {
  const timestamp = new Date().toISOString();
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.error(`[${timestamp}] ❌ TTS Service - API key not configured`);
    throw new Error('API key not configured');
  }
  
  console.log(`[${timestamp}] 🎤 TTS Service - Making API call to Gemini TTS...`);

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text }]}],
        generationConfig: {
          responseModalities: ['audio'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
        }
      })
    }
  );

  if (!resp.ok) {
    const errorText = await resp.text();
    let retryAfterMs;
    try {
      const parsed = JSON.parse(errorText);
      const retryInfo = parsed?.error?.details?.find(d => d['@type']?.includes('RetryInfo'));
      if (retryInfo?.retryDelay) {
        const sec = parseInt(String(retryInfo.retryDelay).replace(/\D/g, '')) || 0;
        retryAfterMs = sec * 1000;
      }
    } catch {}
    const error = new Error('Failed to generate speech');
    error.status = resp.status;
    error.retryAfterMs = retryAfterMs;
    throw error;
  }

  const data = await resp.json();
  const audioData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!audioData) {
    console.error(`[${timestamp}] ❌ TTS Service - No audio data in response`);
    throw new Error('No audio data generated');
  }

  let finalMimeType = audioData.mimeType;
  if (String(audioData.mimeType).includes('L16') || String(audioData.mimeType).includes('pcm')) {
    finalMimeType = 'audio/wav';
    console.log(`[${timestamp}] 🔄 TTS Service - Converting PCM to WAV`);
  }

  console.log(`[${timestamp}] ✅ TTS Service - Audio generated: ${finalMimeType} (${audioData.data.length} chars base64)`);
  return {
    audio: audioData.data,
    mimeType: finalMimeType,
    originalMimeType: audioData.mimeType
  };
}

module.exports = { callGemini, callTts };

