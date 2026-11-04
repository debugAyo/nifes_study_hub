const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const extractRoutes = require('./routes/extract');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Security headers ─────────────────────────────
// Allow cross-origin asset access (so Vercel frontend can display /uploads)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ─── CORS ─────────────────────────────────────────
var configuredOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(function (s) { return s.trim(); })
  : ['http://localhost:8000', 'http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:8000'];

app.use(cors({
  origin: function (origin, cb) {
    if (!origin) return cb(null, true);
    if (configuredOrigins.includes('*')) return cb(null, true);
    if (configuredOrigins.includes(origin)) return cb(null, true);
    // Automatically allow Vercel previews and production domains (*.vercel.app)
    if (/\.vercel\.app$/i.test(origin)) return cb(null, true);
    console.warn('[CORS] Blocked request from origin:', origin);
    cb(null, false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// ─── Rate limiting ────────────────────────────────
var apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

var extractLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Extraction limit reached. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);
app.use('/api/extract', extractLimiter);

// ─── Routes ───────────────────────────────────────
// Health check (no auth — defined before router to avoid requireAuth middleware)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', extractRoutes);

// Suppress favicon 404 logs
app.get('/favicon.ico', (req, res) => res.status(204).end());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Start ────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`NIFES Study Hub server running on http://localhost:${PORT}`);
});
