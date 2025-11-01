/**
 * API Routes
 */
const { Router } = require('express');
const geminiController = require('../controllers/geminiController');
const ttsController = require('../controllers/ttsController');
const historyController = require('../controllers/historyController');

const router = Router();

// Gemini routes
router.post('/gemini', geminiController.postGemini);

// TTS routes
router.post('/tts', ttsController.postTts);

// History routes
router.get('/history/list', historyController.listHistory);
router.post('/history/find', historyController.findHistory);
router.post('/history/save-audio', historyController.saveAudio);
router.post('/history/audio', historyController.getAudio);

module.exports = router;

