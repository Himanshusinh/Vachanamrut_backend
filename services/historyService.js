/**
 * Service for managing history data storage
 */
const fs = require('fs').promises;
const path = require('path');
const { normalizeQuestion, sanitizeBase64 } = require('../utils/normalization');

// Base folder to persist history in backend folder
const historyRoot = path.join(__dirname, '..', 'history');

/**
 * List all history sessions
 * @returns {Promise<Array>} List of session summaries
 */
async function listHistory() {
  let entries = [];
  try {
    entries = await fs.readdir(historyRoot);
  } catch {
    return [];
  }

  const sessions = [];
  for (const entry of entries) {
    const tsNum = Number(entry);
    if (!Number.isFinite(tsNum)) continue;
    const sessionDir = path.join(historyRoot, entry);
    let files = [];
    try {
      files = await fs.readdir(sessionDir);
    } catch {
      continue;
    }
    const jsons = files.filter(f => f.endsWith('.json')).sort();
    const partsCount = files.filter(f => f.endsWith('.b64')).length;
    let question;
    let answerPreview;
    if (jsons.length > 0) {
      try {
        const metaRaw = await fs.readFile(path.join(sessionDir, jsons[0]), 'utf8');
        const meta = JSON.parse(metaRaw);
        question = meta.question;
        answerPreview = meta.answerPreview;
      } catch {}
    }
    sessions.push({ timestamp: tsNum, question, answerPreview, parts: partsCount });
  }
  sessions.sort((a, b) => b.timestamp - a.timestamp);
  return sessions;
}

/**
 * Find a history session by normalized question with similarity matching (80-90% threshold)
 * @param {string} question - Question to search for
 * @param {number} similarityThreshold - Minimum similarity (0.8 = 80%, default 0.8)
 * @returns {Promise<{found: boolean, answer?: string, ttsParts?: Array, similarity?: number}>} Search result
 */
async function findHistory(question, similarityThreshold = 0.8) {
  const timestamp = new Date().toISOString();
  const { calculateSimilarity } = require('../utils/normalization');
  const normalized = normalizeQuestion(question);
  
  let sessions = [];
  try {
    sessions = await fs.readdir(historyRoot);
  } catch {
    console.log(`[${timestamp}] 🔍 History Service - No history directory found`);
    return { found: false };
  }

  const sorted = sessions.filter(s => Number.isFinite(Number(s))).sort((a, b) => Number(b) - Number(a));
  let bestMatch = null;
  let bestSimilarity = 0;

  console.log(`[${timestamp}] 🔍 History Service - Searching ${sorted.length} sessions for similar questions...`);

  for (const sess of sorted) {
    const sessionDir = path.join(historyRoot, sess);
    const summaryPath = path.join(sessionDir, 'session.json');
    let summaryRaw = null;
    try {
      summaryRaw = await fs.readFile(summaryPath, 'utf8');
    } catch {
      continue;
    }
    let summary = {};
    try {
      summary = JSON.parse(summaryRaw);
    } catch {
      continue;
    }
    
    const cachedQuestionNormalized = summary?.questionNormalized || '';
    if (!cachedQuestionNormalized) continue;
    
    // Calculate similarity
    const similarity = calculateSimilarity(question, summary?.question || '');
    
    // Check for exact match first
    if (cachedQuestionNormalized === normalized) {
      console.log(`[${timestamp}] ✅ History Service - Found exact match (100% similarity)`);
      // Load audio parts for exact match
      let files = [];
      try {
        files = await fs.readdir(sessionDir);
      } catch {}
      const partJsons = files.filter(f => f.startsWith('part-') && f.endsWith('.json')).sort();
      const parts = [];
      for (const meta of partJsons) {
        const idxStr = meta.slice('part-'.length, meta.length - '.json'.length);
        const b64File = `part-${idxStr}.b64`;
        try {
          const [metaRaw, audioB64] = await Promise.all([
            fs.readFile(path.join(sessionDir, meta), 'utf8'),
            fs.readFile(path.join(sessionDir, b64File), 'utf8'),
          ]);
          const m = JSON.parse(metaRaw);
          parts.push({
            audio: sanitizeBase64(audioB64 || ''),
            mimeType: m?.mimeType || 'audio/wav',
            originalMimeType: m?.originalMimeType
          });
        } catch {}
      }
      return {
        found: true,
        answer: String(summary?.answer || ''),
        ttsParts: parts,
        similarity: 1.0,
        exactMatch: true
      };
    }
    
    // Track best similarity match
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = {
        session: sess,
        sessionDir,
        summary,
        similarity
      };
    }
  }

  // If we found a similar question (80-90% match), return it
  if (bestMatch && bestSimilarity >= similarityThreshold) {
    const matchPercent = Math.round(bestSimilarity * 100);
    console.log(`[${timestamp}] ✅ History Service - Found similar question (${matchPercent}% match, threshold: ${Math.round(similarityThreshold * 100)}%)`);
    console.log(`[${timestamp}] 📝 Original: "${bestMatch.summary?.question?.substring(0, 80)}${bestMatch.summary?.question?.length > 80 ? '...' : ''}"`);
    console.log(`[${timestamp}] 📝 Current:  "${question.substring(0, 80)}${question.length > 80 ? '...' : ''}"`);
    
    // Load audio parts
    let files = [];
    try {
      files = await fs.readdir(bestMatch.sessionDir);
    } catch {}
    const partJsons = files.filter(f => f.startsWith('part-') && f.endsWith('.json')).sort();
    const parts = [];
    for (const meta of partJsons) {
      const idxStr = meta.slice('part-'.length, meta.length - '.json'.length);
      const b64File = `part-${idxStr}.b64`;
      try {
        const [metaRaw, audioB64] = await Promise.all([
          fs.readFile(path.join(bestMatch.sessionDir, meta), 'utf8'),
          fs.readFile(path.join(bestMatch.sessionDir, b64File), 'utf8'),
        ]);
        const m = JSON.parse(metaRaw);
        parts.push({
          audio: sanitizeBase64(audioB64 || ''),
          mimeType: m?.mimeType || 'audio/wav',
          originalMimeType: m?.originalMimeType
        });
      } catch {}
    }
    
    return {
      found: true,
      answer: String(bestMatch.summary?.answer || ''),
      ttsParts: parts,
      similarity: bestSimilarity,
      exactMatch: false
    };
  }

  if (bestMatch) {
    const matchPercent = Math.round(bestSimilarity * 100);
    console.log(`[${timestamp}] ℹ️  History Service - Best match found (${matchPercent}%) but below threshold (${Math.round(similarityThreshold * 100)}%)`);
  } else {
    console.log(`[${timestamp}] ℹ️  History Service - No similar questions found`);
  }
  
  return { found: false };
}

/**
 * Save audio data and session metadata
 * @param {Object} data - Audio and session data
 * @returns {Promise<boolean>} Success status
 */
async function saveAudio(data) {
  const timestamp = new Date().toISOString();
  const { audioBase64, mimeType, originalMimeType, question, answer, index, timestamp: sessionTimestamp } = data;
  const ts = typeof sessionTimestamp === 'number' ? sessionTimestamp : Date.now();
  const idx = typeof index === 'number' ? index : 0;

  console.log(`[${timestamp}] 💾 History Service - Preparing to save to backend/history/${ts}/`);

  await fs.mkdir(historyRoot, { recursive: true });
  const sessionDir = path.join(historyRoot, String(ts));
  await fs.mkdir(sessionDir, { recursive: true });
  console.log(`[${timestamp}] 📁 History Service - Created session directory: ${sessionDir}`);

  if (typeof question === 'string' && typeof answer === 'string') {
    const summaryPath = path.join(sessionDir, 'session.json');
    try {
      await fs.access(summaryPath);
      console.log(`[${timestamp}] ℹ️  History Service - session.json already exists, skipping`);
    } catch {
      const summary = {
        question,
        questionNormalized: normalizeQuestion(question),
        answer,
        createdAt: ts
      };
      try {
        await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
        console.log(`[${timestamp}] ✅ History Service - Saved session.json with question and answer`);
        console.log(`[${timestamp}]    📝 Question: "${question.substring(0, 80)}${question.length > 80 ? '...' : ''}"`);
        console.log(`[${timestamp}]    💬 Answer: "${answer.substring(0, 100)}${answer.length > 100 ? '...' : ''}"`);
      } catch (err) {
        console.error(`[${timestamp}] ❌ History Service - Failed to save session.json: ${err.message}`);
      }
    }
  }

  const safeIdx = String(idx).padStart(3, '0');
  const baseName = `part-${safeIdx}`;
  const b64Path = path.join(sessionDir, `${baseName}.b64`);
  const metaPath = path.join(sessionDir, `${baseName}.json`);

  console.log(`[${timestamp}] 💾 History Service - Saving audio part ${idx}...`);
  console.log(`[${timestamp}]    📄 File: ${baseName}.b64 (${audioBase64.length} chars base64)`);
  console.log(`[${timestamp}]    📄 File: ${baseName}.json (metadata)`);

  await fs.writeFile(b64Path, audioBase64, 'utf8');
  console.log(`[${timestamp}] ✅ History Service - Saved audioBase64 to ${b64Path}`);

  const metadata = {
    mimeType,
    originalMimeType,
    index: idx,
    timestamp: ts,
    question: typeof question === 'string' ? question : undefined,
    answerPreview: typeof answer === 'string' ? answer.slice(0, 160) : undefined
  };
  await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
  console.log(`[${timestamp}] ✅ History Service - Saved metadata to ${metaPath}`);
  console.log(`[${timestamp}] ✅ History Service - All data saved successfully to backend/history/${ts}/`);
  
  return true;
}

/**
 * Get audio data for a specific session and index
 * @param {number} timestamp - Session timestamp
 * @param {number} index - Audio part index
 * @returns {Promise<{audioBase64: string, mimeType: string, originalMimeType?: string}>} Audio data
 */
async function getAudio(timestamp, index) {
  const sessionDir = path.join(historyRoot, String(timestamp));
  const baseName = `part-${String(index).padStart(3, '0')}`;
  const b64Path = path.join(sessionDir, `${baseName}.b64`);
  const metaPath = path.join(sessionDir, `${baseName}.json`);
  const [b64, metaRaw] = await Promise.all([
    fs.readFile(b64Path, 'utf8'),
    fs.readFile(metaPath, 'utf8').catch(() => '{}')
  ]);
  const meta = JSON.parse(metaRaw);
  const mimeType = meta.mimeType || 'audio/wav';
  return {
    audioBase64: String(b64 || '').trim(),
    mimeType,
    originalMimeType: meta.originalMimeType
  };
}

module.exports = {
  listHistory,
  findHistory,
  saveAudio,
  getAudio
};

