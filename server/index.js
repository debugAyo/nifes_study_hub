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
app.use(helmet());

// ─── CORS ─────────────────────────────────────────
var allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:8000', 'http://localhost:3000'];

app.use(cors({
  origin: function (origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, false);
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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
