const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { extractText } = require('../services/pdfParser');
const { extractQuestions } = require('../services/questionExtractor');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─── Multer setup ──────────────────────────────────
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadDir); },
  filename: function (req, file, cb) {
    var unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'));
  }
});

var allowedMimes = ['application/pdf'];
var upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (allowedMimes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  }
});

// All routes below require authentication
router.use(requireAuth);

// ─── POST /api/extract ─────────────────────────────
router.post('/extract', upload.single('pdf'), async function(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });

    var filePath = req.file.path;
    var rawText = await extractText(filePath);
    var questions = extractQuestions(rawText);

    // Clean up temp file
    if (fs.existsSync(filePath)) fs.unlink(filePath, function() {});

    res.json({
      success: true,
      fileName: req.file.originalname,
      pageCount: rawText.length > 0 ? Math.ceil(rawText.length / 3000) : 0,
      questionsCount: questions.length,
      questions: questions,
      rawTextSnippet: rawText.slice(0, 500),
    });
  } catch (err) {
    console.error('[extract] error:', err);
    res.status(500).json({ error: 'Failed to extract questions from PDF. Please try again.' });
  }
});

// ─── POST /api/upload-extracted ────────────────────
router.post('/upload-extracted', async function(req, res) {
  try {
    var { questions, level, course, code, year, topic } = req.body;

    // Input validation
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'No questions provided' });
    }
    if (questions.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 questions per batch' });
    }
    if (level && !['100', '200', '300'].includes(level)) {
      return res.status(400).json({ error: 'Invalid level' });
    }

    var supabaseUrl = process.env.SUPABASE_URL;
    var supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase service key not configured on server' });
    }

    var supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    var records = questions.map(function(q) {
      if (!q.question || typeof q.question !== 'string') return null;
      var answer = q.answer || '';
      if (q.type === 'MCQ' && q.options && !answer) {
        answer = JSON.stringify({ options: q.options, correct: '' });
      }
      return {
        level: level || '100',
        course: course || 'General',
        code: code || '',
        year: year || '',
        topic: topic || '',
        type: q.type || 'Theory',
        question: q.question,
        answer: answer,
      };
    }).filter(Boolean);

    if (records.length === 0) {
      return res.status(400).json({ error: 'No valid questions to upload' });
    }

    var result = await supabase.from('questions').insert(records).select();
    if (result.error) throw result.error;

    res.json({ success: true, count: result.data.length, data: result.data });
  } catch (err) {
    console.error('[upload-extracted] error:', err);
    res.status(500).json({ error: 'Failed to upload questions. Please try again.' });
  }
});

module.exports = router;
