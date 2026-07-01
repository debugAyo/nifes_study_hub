const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { extractText } = require('../services/pdfParser');
const { extractQuestions } = require('../services/questionExtractor');

const router = express.Router();

// Multer setup — store in /uploads temporarily
const uploadDir = path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadDir); },
  filename: function (req, file, cb) {
    var unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'));
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files allowed'));
  }
});

// ─── POST /api/extract ─────────────────────────────
// Upload a PDF, extract text, detect questions, return them as JSON.
router.post('/extract', upload.single('pdf'), async function(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });

    var filePath = req.file.path;
    var rawText = await extractText(filePath);
    var questions = extractQuestions(rawText);

    // Clean up temp file
    fs.unlink(filePath, function() {});

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
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/upload-extracted ────────────────────
// Save extracted questions to Supabase (batch insert).
router.post('/upload-extracted', async function(req, res) {
  try {
    var { questions, level, course, code, year, topic } = req.body;
    if (!questions || !questions.length) return res.status(400).json({ error: 'No questions provided' });

    var supabaseUrl = process.env.SUPABASE_URL;
    var supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Supabase not configured on server' });

    var supabase = createClient(supabaseUrl, supabaseKey);

    var records = questions.map(function(q) {
      var answer = q.answer || '';
      if (q.type === 'MCQ' && q.options) {
        // Store MCQ options as JSON in the answer field (same format as frontend)
        if (!answer) answer = JSON.stringify({ options: q.options, correct: '' });
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
    });

    var result = await supabase.from('questions').insert(records).select();
    if (result.error) throw result.error;

    res.json({ success: true, count: result.data.length, data: result.data });
  } catch (err) {
    console.error('[upload-extracted] error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
