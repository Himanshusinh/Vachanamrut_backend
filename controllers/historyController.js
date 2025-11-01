/**
 * Controller for History API endpoints
 */
const historyService = require('../services/historyService');

/**
 * GET /api/history/list
 * List all history sessions
 */
async function listHistory(req, res) {
  const timestamp = new Date().toISOString();
  try {
    console.log(`[${timestamp}] 📋 GET /api/history/list - Listing all sessions...`);
    const sessions = await historyService.listHistory();
    console.log(`[${timestamp}] ✅ GET /api/history/list - Found ${sessions.length} sessions`);
    return res.json({ sessions });
  } catch (e) {
    console.error(`[${timestamp}] ❌ GET /api/history/list - Error: ${e.message}`);
    return res.status(500).json({ error: 'Failed to list history' });
  }
}

/**
 * POST /api/history/find
 * Find a history session by question
 */
async function findHistory(req, res) {
  const timestamp = new Date().toISOString();
  try {
    const { question } = req.body || {};
    if (typeof question !== 'string' || !question.trim()) {
      console.log(`[${timestamp}] ❌ POST /api/history/find - Missing question`);
      return res.status(400).json({ error: 'question is required' });
    }

    console.log(`[${timestamp}] 🔍 POST /api/history/find - Searching for: "${question.substring(0, 100)}${question.length > 100 ? '...' : ''}"`);
    const result = await historyService.findHistory(question);
    if (result.found) {
      console.log(`[${timestamp}] ✅ POST /api/history/find - Found matching session!`);
    } else {
      console.log(`[${timestamp}] ℹ️  POST /api/history/find - No matching session found`);
    }
    return res.json(result);
  } catch (e) {
    console.error(`[${timestamp}] ❌ POST /api/history/find - Error: ${e.message}`);
    return res.status(500).json({ error: 'Failed to search history' });
  }
}

/**
 * POST /api/history/save-audio
 * Save audio data and session metadata
 */
async function saveAudio(req, res) {
  const timestamp = new Date().toISOString();
  try {
    const { audioBase64, mimeType, question, answer, index, timestamp: sessionTimestamp } = req.body || {};
    if (!audioBase64 || !mimeType) {
      console.log(`[${timestamp}] ❌ POST /api/history/save-audio - Missing required fields`);
      return res.status(400).json({ error: 'audioBase64 and mimeType are required' });
    }

    console.log(`[${timestamp}] 💾 POST /api/history/save-audio - Saving data...`);
    console.log(`[${timestamp}] 📊 Save details: timestamp=${sessionTimestamp || Date.now()}, index=${index || 0}, audioSize=${audioBase64.length} chars`);
    if (question) {
      console.log(`[${timestamp}] ❓ Question: "${question.substring(0, 100)}${question.length > 100 ? '...' : ''}"`);
    }
    if (answer) {
      console.log(`[${timestamp}] 💬 Answer: "${answer.substring(0, 150)}${answer.length > 150 ? '...' : ''}"`);
    }

    await historyService.saveAudio(req.body);
    
    console.log(`[${timestamp}] ✅ POST /api/history/save-audio - Successfully saved to backend/history/ folder`);
    return res.json({ ok: true });
  } catch (e) {
    console.error(`[${timestamp}] ❌ POST /api/history/save-audio - Error: ${e.message}`);
    console.error(`[${timestamp}] ❌ Error stack: ${e.stack}`);
    return res.status(500).json({ error: 'Failed to save audio' });
  }
}

/**
 * POST /api/history/audio
 * Get audio data for a specific session and index
 */
async function getAudio(req, res) {
  const timestamp = new Date().toISOString();
  try {
    const { timestamp: sessionTimestamp, index } = req.body || {};
    if (!sessionTimestamp || typeof index !== 'number') {
      console.log(`[${timestamp}] ❌ POST /api/history/audio - Missing required fields`);
      return res.status(400).json({ error: 'timestamp and index are required' });
    }

    console.log(`[${timestamp}] 📥 POST /api/history/audio - Loading audio: timestamp=${sessionTimestamp}, index=${index}`);
    const audioData = await historyService.getAudio(sessionTimestamp, index);
    console.log(`[${timestamp}] ✅ POST /api/history/audio - Audio loaded (${audioData.audioBase64.length} chars)`);
    return res.json(audioData);
  } catch (e) {
    console.error(`[${timestamp}] ❌ POST /api/history/audio - Error: ${e.message}`);
    return res.status(500).json({ error: 'Failed to load audio' });
  }
}

module.exports = { listHistory, findHistory, saveAudio, getAudio };

