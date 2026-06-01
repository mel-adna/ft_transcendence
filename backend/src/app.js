// ==========================================
// Team-Pulse Dashboard Backend Core Server
// ==========================================

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const express = require('express');
const http = require('http');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const statsRoutes = require('./routes/statsRoutes');

const app = express();
const server = http.createServer(app);

// Trust proxy for express-rate-limit behind Nginx reverse proxy
app.set('trust proxy', 1);

// 1. Core Rate Limiter to prevent Denial of Service (DoS) - Requirement E
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // Limit each IP to 60 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 2. Public API Key Checker - Requirement E
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const SYSTEM_API_KEY = process.env.PUBLIC_API_KEY || 'team_pulse_public_api_secret_token';

  if (!apiKey || apiKey !== SYSTEM_API_KEY) {
    return res.status(403).json({ error: 'Forbidden: Invalid API key provided.' });
  }
  next();
};

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limits and API key validation strictly to public stats endpoints
app.use('/api/stats', apiLimiter, validateApiKey, statsRoutes);

// Health check API endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Start Server
const PORT = process.env.PORT || 5005;
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

module.exports = { app, server };
