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


/* ─── Pomodoro Study Timer ─────────────────────── */
var POMODORO_DEFAULTS = { work: 25, shortBreak: 5, longBreak: 15 };
var pomodoroSettings = JSON.parse(localStorage.getItem('nifes_pomodoro_settings') || 'null') || POMODORO_DEFAULTS;
var pomodoroMode = 'work'; // 'work' | 'shortBreak' | 'longBreak'
var pomodoroTimeLeft = pomodoroSettings.work * 60;
var pomodoroTotalTime = pomodoroSettings.work * 60;
var pomodoroTimer = null;
var pomodoroIsRunning = false;
var pomodoroSessionsToday = parseInt(localStorage.getItem('nifes_pomodoro_sessions_' + new Date().toDateString()) || '0', 10);
var pomodoroCurrentTask = localStorage.getItem('nifes_pomodoro_task') || '';

function playPomodoroChime() {
  try {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    var ctx = new AudioCtx();
    var now = ctx.currentTime;
    
    // Smooth pleasant study bell chime (Chord: C5 + G5 + C6)
    var freqs = [523.25, 659.25, 783.99, 1046.50];
    freqs.forEach(function(f, idx) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + (idx * 0.08));
      
      gain.gain.setValueAtTime(0.001, now + (idx * 0.08));
      gain.gain.exponentialRampToValueAtTime(0.2, now + (idx * 0.08) + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (idx * 0.08) + 1.2);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + (idx * 0.08));
      osc.stop(now + (idx * 0.08) + 1.25);
    });
  } catch (e) {
    console.log('Audio chime not available or blocked:', e);
  }
}

function initPomodoroView() {
  updatePomodoroDisplay();
  updatePomodoroStats();
  var taskInput = document.getElementById('pomodoroTaskInput');
  if (taskInput) taskInput.value = pomodoroCurrentTask;
}

function setPomodoroMode(mode) {
  if (pomodoroIsRunning) pausePomodoro();
  pomodoroMode = mode;
  var mins = pomodoroSettings[mode] || 25;
  pomodoroTimeLeft = mins * 60;
  pomodoroTotalTime = mins * 60;
  
  // Update mode tabs
  var tabs = document.querySelectorAll('.pomodoro-mode-btn');
  tabs.forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
  });

  updatePomodoroDisplay();
}

function togglePomodoro() {
  if (pomodoroIsRunning) {
    pausePomodoro();
  } else {
    startPomodoro();
  }
}

function startPomodoro() {
  if (pomodoroIsRunning) return;
  pomodoroIsRunning = true;
  updatePomodoroPlayButton();
  
  pomodoroTimer = setInterval(function() {
    if (pomodoroTimeLeft > 0) {
      pomodoroTimeLeft--;
      updatePomodoroDisplay();
    } else {
      clearInterval(pomodoroTimer);
      pomodoroIsRunning = false;
      playPomodoroChime();
      
      if (pomodoroMode === 'work') {
        pomodoroSessionsToday++;
        localStorage.setItem('nifes_pomodoro_sessions_' + new Date().toDateString(), String(pomodoroSessionsToday));
        showToast('success', 'Great focus session! Time for a well-deserved break.');
        // Next: if every 4 sessions, offer long break, else short break
        if (pomodoroSessionsToday % 4 === 0) {
          setPomodoroMode('longBreak');
        } else {
          setPomodoroMode('shortBreak');
        }
      } else {
        showToast('info', 'Break finished! Ready for the next focus sprint?');
        setPomodoroMode('work');
      }
      updatePomodoroPlayButton();
      updatePomodoroStats();
    }
  }, 1000);
}

function pausePomodoro() {
  if (!pomodoroIsRunning) return;
  clearInterval(pomodoroTimer);
  pomodoroIsRunning = false;
  updatePomodoroPlayButton();
  updatePomodoroMiniPill();
}

function resetPomodoro() {
  pausePomodoro();
  var mins = pomodoroSettings[pomodoroMode] || 25;
  pomodoroTimeLeft = mins * 60;
  pomodoroTotalTime = mins * 60;
  updatePomodoroDisplay();
}

function skipPomodoro() {
  pausePomodoro();
  if (pomodoroMode === 'work') {
    setPomodoroMode('shortBreak');
  } else {
    setPomodoroMode('work');
  }
}

function formatPomodoroTime(seconds) {
  var m = Math.floor(seconds / 60);
  var s = seconds % 60;
  return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

function updatePomodoroDisplay() {
  var timeStr = formatPomodoroTime(pomodoroTimeLeft);
  var timeEl = document.getElementById('pomodoroTime');
  if (timeEl) timeEl.textContent = timeStr;

  // SVG Circular progress
  var ring = document.getElementById('pomodoroProgressRing');
  if (ring) {
    var radius = 130;
    var circumference = 2 * Math.PI * radius;
    ring.style.strokeDasharray = circumference;
    var fraction = pomodoroTotalTime > 0 ? (pomodoroTimeLeft / pomodoroTotalTime) : 0;
    ring.style.strokeDashoffset = circumference * (1 - fraction);
  }

  // Update Mini Header Pill
  updatePomodoroMiniPill();

  // Page title indicator when running
  if (pomodoroIsRunning) {
    document.title = '(' + timeStr + ') NIFES Study Hub';
  } else {
    document.title = 'NIFES Study Hub';
  }
}

function updatePomodoroPlayButton() {
  var btn = document.getElementById('pomodoroToggleBtn');
  if (!btn) return;
  if (pomodoroIsRunning) {
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause';
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-secondary');
  } else {
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Start Focus';
    btn.classList.remove('btn-secondary');
    btn.classList.add('btn-primary');
  }
}

function updatePomodoroMiniPill() {
  var pill = document.getElementById('pomodoroMiniPill');
  if (!pill) return;
  
  // Show pill if timer is running or paused mid-session
  var isMidSession = pomodoroTimeLeft < pomodoroTotalTime;
  if (pomodoroIsRunning || isMidSession) {
    pill.style.display = 'inline-flex';
    var icon = pomodoroMode === 'work' ? '🍅' : '☕';
    var textEl = pill.querySelector('.pill-time');
    if (textEl) textEl.textContent = icon + ' ' + formatPomodoroTime(pomodoroTimeLeft);
    pill.classList.toggle('running', pomodoroIsRunning);
  } else {
    pill.style.display = 'none';
  }
}

function updatePomodoroStats() {
  var countEl = document.getElementById('pomodoroSessionCount');
  if (countEl) countEl.textContent = pomodoroSessionsToday;
  var totalMinsEl = document.getElementById('pomodoroTotalMinutes');
  if (totalMinsEl) totalMinsEl.textContent = (pomodoroSessionsToday * (pomodoroSettings.work || 25)) + ' mins';
}

function handlePomodoroTaskChange(val) {
  pomodoroCurrentTask = val;
  localStorage.setItem('nifes_pomodoro_task', val);
}

function openPomodoroSettings() {
  var modal = document.getElementById('pomodoroSettingsModal');
  if (!modal) return;
  document.getElementById('pomSetWork').value = pomodoroSettings.work || 25;
  document.getElementById('pomSetShort').value = pomodoroSettings.shortBreak || 5;
  document.getElementById('pomSetLong').value = pomodoroSettings.longBreak || 15;
  modal.classList.remove('hidden');
}

function closePomodoroSettings() {
  var modal = document.getElementById('pomodoroSettingsModal');
  if (modal) modal.classList.add('hidden');
}

function savePomodoroSettings(e) {
  if (e) e.preventDefault();
  var w = Math.max(1, parseInt(document.getElementById('pomSetWork').value) || 25);
  var sb = Math.max(1, parseInt(document.getElementById('pomSetShort').value) || 5);
  var lb = Math.max(1, parseInt(document.getElementById('pomSetLong').value) || 15);
  
  pomodoroSettings = { work: w, shortBreak: sb, longBreak: lb };
  localStorage.setItem('nifes_pomodoro_settings', JSON.stringify(pomodoroSettings));
  closePomodoroSettings();
  showToast('success', 'Pomodoro settings saved!');
  resetPomodoro();
}
