/* ══════════════════════════════════════════════════
   NIFES Study Hub — Tools (Calculator + CGPA)
   ══════════════════════════════════════════════════ */

/* ─── Calculator ──────────────────────────────── */
var calcExpression = '';
var calcResult = '';

function renderCalculator() {
  var expEl = document.getElementById('calcExpression');
  var resEl = document.getElementById('calcResult');
  if (expEl) expEl.textContent = calcExpression || '0';
  if (resEl) resEl.textContent = calcResult || '';
}

function calcInput(val) { calcExpression += val; renderCalculator(); }
function calcClear() { calcExpression = ''; calcResult = ''; renderCalculator(); }
function calcBackspace() { calcExpression = calcExpression.slice(0, -1); renderCalculator(); }

function calcEquals() {
  try {
    var expr = calcExpression
      .replace(/×/g, '*').replace(/÷/g, '/')
      .replace(/sin\(/g, 'Math.sin((Math.PI/180)*')
      .replace(/cos\(/g, 'Math.cos((Math.PI/180)*')
      .replace(/tan\(/g, 'Math.tan((Math.PI/180)*')
      .replace(/log\(/g, 'Math.log10(').replace(/ln\(/g, 'Math.log(')
      .replace(/√\(/g, 'Math.sqrt(').replace(/π/g, 'Math.PI')
      .replace(/e(?![xp])/g, 'Math.E').replace(/x²/g, '**2').replace(/\^/g, '**');
    var result = Function('"use strict"; return (' + expr + ')')();
    calcResult = String(parseFloat(result.toFixed(10)));
    renderCalculator();
  } catch { calcResult = 'Error'; renderCalculator(); }
}

function calcSquare() {
  try {
    var val = parseFloat(calcExpression) || 0;
    calcResult = String(val * val);
    calcExpression = calcResult;
    renderCalculator();
  } catch { calcResult = 'Error'; renderCalculator(); }
}

function calcToggleSign() {
  if (calcExpression.startsWith('-')) calcExpression = calcExpression.slice(1);
  else if (calcExpression && calcExpression !== '0') calcExpression = '-' + calcExpression;
  renderCalculator();
}

function initCalculatorView() { calcExpression = ''; calcResult = ''; renderCalculator(); }

/* ─── CGPA Calculator ─────────────────────────── */
var GRADE_POINTS = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };

function initCGPAView() {
  document.getElementById('cgpaSemesters').value = 1;
  generateSemesterInputs(1);
  document.getElementById('cgpaResults').innerHTML = '';
}

function generateSemesterInputs(count) {
  var container = document.getElementById('cgpaSemesterInputs');
  if (!container) return;
  var num = parseInt(count) || 1;
  container.innerHTML = '';
  for (var i = 1; i <= num; i++) {
    (function(sem) {
      var div = document.createElement('div');
      div.className = 'semester-card';
      div.innerHTML =
        '<div class="semester-header">' +
          '<span class="semester-title">Semester ' + sem + '</span>' +
          '<button class="btn-ghost btn-sm" onclick="addCourseRow(' + sem + ')">+ Add Course</button>' +
        '</div>' +
        '<table class="cgpa-table">' +
          '<thead><tr><th style="width:40%">Course</th><th style="width:20%">Credit</th><th style="width:15%">Grade</th><th style="width:15%">GP</th><th style="width:10%"></th></tr></thead>' +
          '<tbody id="sem-' + sem + '-body"></tbody>' +
        '</table>' +
        '<div class="semester-gpa" style="margin-top:var(--space-3);text-align:right;font-size:var(--text-sm);color:var(--color-text-muted)">' +
          'Semester GPA: <strong id="sem-' + sem + '-gpa">0.00</strong>' +
        '</div>';
      container.appendChild(div);
      addCourseRow(sem);
      addCourseRow(sem);
    })(i);
  }
}

function addCourseRow(semester) {
  var tbody = document.getElementById('sem-' + semester + '-body');
  if (!tbody) return;
  var tr = document.createElement('tr');
  tr.innerHTML =
    '<td><input type="text" placeholder="Course" oninput="recalcSemester(' + semester + ')" style="width:100%;padding:var(--space-1) var(--space-2);border:1px solid var(--color-border);border-radius:var(--radius-sm);background:var(--color-surface-offset)"></td>' +
    '<td><input type="number" min="1" max="5" value="3" oninput="recalcSemester(' + semester + ')" style="width:100%;padding:var(--space-1) var(--space-2);border:1px solid var(--color-border);border-radius:var(--radius-sm);background:var(--color-surface-offset)"></td>' +
    '<td>' +
      '<select onchange="recalcSemester(' + semester + ')" style="width:100%;padding:var(--space-1) var(--space-2);border:1px solid var(--color-border);border-radius:var(--radius-sm);background:var(--color-surface-offset)">' +
        '<option value="A">A</option><option value="B">B</option><option value="C" selected>C</option>' +
        '<option value="D">D</option><option value="E">E</option><option value="F">F</option>' +
      '</select>' +
    '</td>' +
    '<td style="text-align:center" class="cgpa-gp">3.0</td>' +
    '<td><button style="color:var(--color-error);border:none;background:none;cursor:pointer" onclick="this.closest(\'tr\').remove();recalcSemester(' + semester + ');calculateOverallCGPA()">✕</button></td>';
  tbody.appendChild(tr);
  recalcSemester(semester);
}

function recalcSemester(semester) {
  var tbody = document.getElementById('sem-' + semester + '-body');
  if (!tbody) return;
  var totalPoints = 0, totalCredits = 0;
  tbody.querySelectorAll('tr').forEach(function(row) {
    var inputs = row.querySelectorAll('input');
    var selects = row.querySelectorAll('select');
    var credit = parseFloat(inputs[1]?.value) || 0;
    var grade = selects[0]?.value || 'C';
    var gp = GRADE_POINTS[grade] || 0;
    var gpEl = row.querySelector('.cgpa-gp');
    if (gpEl) gpEl.textContent = gp.toFixed(1);
    totalPoints += gp * credit;
    totalCredits += credit;
  });
  var gpa = totalCredits > 0 ? (totalPoints / totalCredits) : 0;
  var gpaEl = document.getElementById('sem-' + semester + '-gpa');
  if (gpaEl) gpaEl.textContent = gpa.toFixed(2);
  calculateOverallCGPA();
}

function calculateOverallCGPA() {
  var semesterCards = document.querySelectorAll('.semester-card');
  var totalPoints = 0, totalCredits = 0;
  semesterCards.forEach(function(card) {
    card.querySelectorAll('tbody tr').forEach(function(row) {
      var inputs = row.querySelectorAll('input');
      var selects = row.querySelectorAll('select');
      var credit = parseFloat(inputs[1]?.value) || 0;
      var grade = selects[0]?.value || 'C';
      totalPoints += (GRADE_POINTS[grade] || 0) * credit;
      totalCredits += credit;
    });
  });
  var cgpa = totalCredits > 0 ? (totalPoints / totalCredits) : 0;
  var cls = cgpa >= 4.5 ? 'cgpa-class-1' : cgpa >= 3.5 ? 'cgpa-class-2-1' : cgpa >= 2.5 ? 'cgpa-class-2-2' : cgpa >= 1.5 ? 'cgpa-class-3' : 'cgpa-class-3';
  var label = cgpa >= 4.5 ? 'First Class' : cgpa >= 3.5 ? 'Second Class Upper' : cgpa >= 2.5 ? 'Second Class Lower' : cgpa >= 1.5 ? 'Third Class' : 'Pass';
  var container = document.getElementById('cgpaResults');
  if (!container) return;
  container.innerHTML =
    '<div class="cgpa-result-card">' +
      '<div class="cgpa-result-grid">' +
        '<div class="cgpa-result-item"><div class="label">Total Credits</div><div class="value">' + totalCredits + '</div></div>' +
        '<div class="cgpa-result-item"><div class="label">Total Quality Points</div><div class="value">' + totalPoints.toFixed(2) + '</div></div>' +
        '<div class="cgpa-result-item"><div class="label">CGPA</div><div class="value ' + cls + '">' + cgpa.toFixed(2) + '</div></div>' +
        '<div class="cgpa-result-item"><div class="label">Classification</div><div class="value ' + cls + '">' + label + '</div></div>' +
      '</div>' +
    '</div>';
}
