/* ─── Question Extraction from Raw PDF Text ───────
   Handles patterns common in Nigerian university past questions:
     • MCQ with options A–D
     • Theory / Calculation
     • Essay questions
   ────────────────────────────────────────────────── */

function extractQuestions(text) {
  var lines = text.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
  var blocks = groupIntoBlocks(lines);
  var questions = [];

  blocks.forEach(function(block) {
    var q = parseBlock(block);
    if (q) questions.push(q);
  });

  return questions;
}

function groupIntoBlocks(lines) {
  var blocks = [];
  var current = [];

  lines.forEach(function(line) {
    // Lines starting with a digit + period/dot → new question block
    if (/^\d+[\.\)]\s/.test(line) && current.length > 0) {
      blocks.push(current);
      current = [line];
    } else {
      current.push(line);
    }
  });
  if (current.length) blocks.push(current);

  return blocks;
}

function parseBlock(block) {
  if (!block.length) return null;

  var first = block[0];
  var match = first.match(/^(\d+)[\.\)]\s*(.*)/);
  if (!match) return null;

  var questionText = match[2];
  var rest = block.slice(1);

  // Check for MCQ pattern: lines starting with A., B., C., D.
  var options = {};
  var optionLines = [];

  rest.forEach(function(line) {
    var optMatch = line.match(/^([A-D])[\.\)]\s*(.*)/);
    if (optMatch) {
      options[optMatch[1]] = optMatch[2];
      optionLines.push(line);
    }
  });

  // If all four options A–D found, treat as MCQ
  var hasAllOptions = options.A && options.B && options.C && options.D;

  if (hasAllOptions) {
    // Remove option lines from rest to get just the question
    var optionSet = new Set(optionLines);
    var extraLines = rest.filter(function(l) { return !optionSet.has(l); });

    // If there's a continuation of the question text before the options, append it
    var fullQuestion = questionText;
    var idx = 0;
    while (idx < extraLines.length && !/^\d+[\.\)]\s/.test(extraLines[idx]) && !/^[A-D][\.\)]\s/.test(extraLines[idx])) {
      fullQuestion += ' ' + extraLines[idx];
      idx++;
    }

    return {
      type: 'MCQ',
      question: fullQuestion,
      options: options,
      answer: '',  // We can't know the correct answer from the PDF alone
    };
  }

  // Theory / Calculation / Essay — collect the full question text
  var fullQuestion = questionText;
  rest.forEach(function(line) {
    // Skip mark lines like (5 marks)
    if (/^\(\d+\s*marks?\)/i.test(line) || /^\d+\s*marks?$/i.test(line)) return;
    fullQuestion += ' ' + line;
  });

  // Determine type based on content
  var type = 'Theory';
  var lower = fullQuestion.toLowerCase();
  if (/(calculate|differentiate|integrate|solve|evaluate|find\s+(the\s+)?(value|derivative|integral|determinant))/i.test(lower)) {
    type = 'Calculation';
  } else if (/(discuss|essay|explain.*detail|write\s+(an\s+)?essay)/i.test(lower)) {
    type = 'Essay';
  }

  return {
    type: type,
    question: fullQuestion.trim(),
    answer: '',
  };
}

module.exports = { extractQuestions };
