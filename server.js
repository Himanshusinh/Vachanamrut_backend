/**
 * Express server setup
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 4000;

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0 && req.method !== 'POST') {
    // Only log body for non-POST requests (POST requests logged in controllers)
    const bodyPreview = JSON.stringify(req.body).substring(0, 200);
    console.log(`[${timestamp}] Request body: ${bodyPreview}${JSON.stringify(req.body).length > 200 ? '...' : ''}`);
  }
  next();
});

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api', routes);

// Health check
app.get('/healthz', (_req, res) => {
  console.log(`[${new Date().toISOString()}] Health check`);
  res.json({ ok: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`🚀 Backend server listening on http://localhost:${PORT}`);
  console.log(`📝 Logs will appear below`);
  console.log(`========================================\n`);
});

module.exports = app;

