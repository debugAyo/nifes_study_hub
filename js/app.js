/* ══════════════════════════════════════════════════
   NIFES Study Hub — Complete Application
   ══════════════════════════════════════════════════ */

/* ─── Supabase Data Layer ─────────────────────── */
let supabaseClient = null;

function initSupabase(url, anonKey) {
  if (supabaseClient) return supabaseClient;
  if (!window.supabase) return null;
  supabaseClient = window.supabase.createClient(url, anonKey);
  return supabaseClient;
}

async function dbFetchQuestions(filters = {}) {
  try {
    if (!supabaseClient) return { success: false, error: 'Supabase not configured', data: [] };
    let query = supabaseClient.from('questions').select('*');
    if (filters.level) query = query.eq('level', filters.level);
    if (filters.course) query = query.eq('course', filters.course);
    if (filters.year) query = query.eq('year', filters.year);
    if (filters.type) query = query.eq('type', filters.type);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('[data] fetchQuestions:', err);
    return { success: false, error: err.message, data: [] };
  }
}

async function dbAddQuestion(questionData) {
  try {
    if (!supabaseClient) return { success: false, error: 'Supabase not configured' };
    const user = await supabaseClient.auth.getUser();
    const payload = { ...questionData, user_id: user?.data?.user?.id || null };
    const { data, error } = await supabaseClient.from('questions').insert(payload).select().single();
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function dbFetchMaterials(filters = {}) {
  try {
    if (!supabaseClient) return { success: false, data: [] };
    let query = supabaseClient.from('materials').select('*');
    if (filters.level) query = query.eq('level', filters.level);
    if (filters.course) query = query.eq('course', filters.course);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message, data: [] };
  }
}

async function dbUploadMaterial(file, metadata) {
  try {
    if (!supabaseClient) return { success: false, error: 'Supabase not configured' };
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return { success: false, error: 'You must be logged in to upload.' };

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = user.id + '/' + timestamp + '_' + safeName;

    const { error: uploadError } = await supabaseClient.storage
      .from('study-materials').upload(filePath, file, { cacheControl: '3600' });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabaseClient.storage
      .from('study-materials').getPublicUrl(filePath);

    const { data, error: dbError } = await supabaseClient.from('materials').insert({
      level: metadata.level, course: metadata.course, code: metadata.code || '',
      title: metadata.title, type: metadata.type, file_url: publicUrl,
      file_name: file.name, file_size: file.size, content_type: file.type, user_id: user.id,
    }).select().single();

    if (dbError) throw dbError;
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function dbSaveQuizSession(sessionData) {
  try {
    if (!supabaseClient) return { success: false, error: 'Supabase not configured' };
    const { data: { user } } = await supabaseClient.auth.getUser();
    const payload = { ...sessionData, user_id: user?.id || null };
    const { data, error } = await supabaseClient.from('quiz_sessions').insert(payload).select().single();
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function dbSignUp(email, password, fullName) {
  try {
    if (!supabaseClient) return { success: false, error: 'Supabase not configured' };
    const { data, error } = await supabaseClient.auth.signUp({
      email, password, options: { data: { full_name: fullName } }
    });
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function dbSignIn(email, password) {
  try {
    if (!supabaseClient) return { success: false, error: 'Supabase not configured' };
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function dbSignInWithGoogle() {
  try {
    if (!supabaseClient) return;
    await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  } catch (err) {
    console.error('Google sign in error:', err);
  }
}

async function dbSignOut() {
  try {
    if (supabaseClient) await supabaseClient.auth.signOut();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function dbOnAuthChange(callback) {
  if (!supabaseClient) return;
  supabaseClient.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

async function dbGetCurrentUser() {
  try {
    if (!supabaseClient) return null;
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
  } catch { return null; }
}

/* ─── Tools: Calculator ──────────────────────────── */
let calcExpression = '';
let calcResult = '';

function renderCalculator() {
  const expEl = document.getElementById('calcExpression');
  const resEl = document.getElementById('calcResult');
  if (expEl) expEl.textContent = calcExpression || '0';
  if (resEl) resEl.textContent = calcResult || '';
}

function calcInput(val) { calcExpression += val; renderCalculator(); }
function calcClear() { calcExpression = ''; calcResult = ''; renderCalculator(); }
function calcBackspace() { calcExpression = calcExpression.slice(0, -1); renderCalculator(); }

function calcEquals() {
  try {
    let expr = calcExpression
      .replace(/×/g, '*').replace(/÷/g, '/')
      .replace(/sin\(/g, 'Math.sin((Math.PI/180)*')
      .replace(/cos\(/g, 'Math.cos((Math.PI/180)*')
      .replace(/tan\(/g, 'Math.tan((Math.PI/180)*')
      .replace(/log\(/g, 'Math.log10(').replace(/ln\(/g, 'Math.log(')
      .replace(/√\(/g, 'Math.sqrt(').replace(/π/g, 'Math.PI')
      .replace(/e(?![xp])/g, 'Math.E').replace(/x²/g, '**2').replace(/\^/g, '**');
    const result = Function('"use strict"; return (' + expr + ')')();
    calcResult = String(parseFloat(result.toFixed(10)));
    renderCalculator();
  } catch { calcResult = 'Error'; renderCalculator(); }
}

function calcSquare() {
  try {
    const val = parseFloat(calcExpression) || 0;
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

/* ─── Tools: CGPA Calculator ─────────────────────── */
const GRADE_POINTS = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };

function initCGPAView() {
  document.getElementById('cgpaSemesters').value = 1;
  generateSemesterInputs(1);
  document.getElementById('cgpaResults').innerHTML = '';
}

function generateSemesterInputs(count) {
  const container = document.getElementById('cgpaSemesterInputs');
  if (!container) return;
  const num = parseInt(count) || 1;
  container.innerHTML = '';
  for (let i = 1; i <= num; i++) {
    const div = document.createElement('div');
    div.className = 'semester-card';
    div.innerHTML = `
      <div class="semester-header">
        <span class="semester-title">Semester ${i}</span>
        <button class="btn-ghost btn-sm" onclick="addCourseRow(${i})">+ Add Course</button>
      </div>
      <table class="cgpa-table">
        <thead><tr>
          <th style="width:40%">Course</th><th style="width:20%">Credit</th>
          <th style="width:15%">Grade</th><th style="width:15%">GP</th><th style="width:10%"></th>
        </tr></thead>
        <tbody id="sem-${i}-body"></tbody>
      </table>
      <div class="semester-gpa" style="margin-top:var(--space-3);text-align:right;font-size:var(--text-sm);color:var(--color-text-muted)">
        Semester GPA: <strong id="sem-${i}-gpa">0.00</strong>
      </div>`;
    container.appendChild(div);
    addCourseRow(i);
    addCourseRow(i);
  }
}

function addCourseRow(semester) {
  const tbody = document.getElementById('sem-' + semester + '-body');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" placeholder="Course" oninput="recalcSemester(${semester})" style="width:100%;padding:var(--space-1) var(--space-2);border:1px solid var(--color-border);border-radius:var(--radius-sm);background:var(--color-surface-offset)"></td>
    <td><input type="number" min="1" max="5" value="3" oninput="recalcSemester(${semester})" style="width:100%;padding:var(--space-1) var(--space-2);border:1px solid var(--color-border);border-radius:var(--radius-sm);background:var(--color-surface-offset)"></td>
    <td>
      <select onchange="recalcSemester(${semester})" style="width:100%;padding:var(--space-1) var(--space-2);border:1px solid var(--color-border);border-radius:var(--radius-sm);background:var(--color-surface-offset)">
        <option value="A">A</option><option value="B">B</option><option value="C" selected>C</option>
        <option value="D">D</option><option value="E">E</option><option value="F">F</option>
      </select>
    </td>
    <td style="text-align:center" class="cgpa-gp">3.0</td>
    <td><button style="color:var(--color-error);border:none;background:none;cursor:pointer" onclick="this.closest('tr').remove();recalcSemester(${semester});calculateOverallCGPA()">✕</button></td>`;
  tbody.appendChild(tr);
  recalcSemester(semester);
}

function recalcSemester(semester) {
  const tbody = document.getElementById('sem-' + semester + '-body');
  if (!tbody) return;
  let totalPoints = 0, totalCredits = 0;
  tbody.querySelectorAll('tr').forEach(row => {
    const inputs = row.querySelectorAll('input');
    const selects = row.querySelectorAll('select');
    const credit = parseFloat(inputs[1]?.value) || 0;
    const grade = selects[0]?.value || 'C';
    const gp = GRADE_POINTS[grade] || 0;
    const gpEl = row.querySelector('.cgpa-gp');
    if (gpEl) gpEl.textContent = gp.toFixed(1);
    totalPoints += gp * credit;
    totalCredits += credit;
  });
  const gpa = totalCredits > 0 ? (totalPoints / totalCredits) : 0;
  const gpaEl = document.getElementById('sem-' + semester + '-gpa');
  if (gpaEl) gpaEl.textContent = gpa.toFixed(2);
  calculateOverallCGPA();
}

function calculateOverallCGPA() {
  const semesterCards = document.querySelectorAll('.semester-card');
  let totalPoints = 0, totalCredits = 0;
  semesterCards.forEach(card => {
    card.querySelectorAll('tbody tr').forEach(row => {
      const inputs = row.querySelectorAll('input');
      const selects = row.querySelectorAll('select');
      const credit = parseFloat(inputs[1]?.value) || 0;
      const grade = selects[0]?.value || 'C';
      totalPoints += (GRADE_POINTS[grade] || 0) * credit;
      totalCredits += credit;
    });
  });
  const cgpa = totalCredits > 0 ? (totalPoints / totalCredits) : 0;
  const cls = cgpa >= 4.5 ? 'cgpa-class-1' : cgpa >= 3.5 ? 'cgpa-class-2-1' : cgpa >= 2.5 ? 'cgpa-class-2-2' : cgpa >= 1.5 ? 'cgpa-class-3' : 'cgpa-class-3';
  const label = cgpa >= 4.5 ? 'First Class' : cgpa >= 3.5 ? 'Second Class Upper' : cgpa >= 2.5 ? 'Second Class Lower' : cgpa >= 1.5 ? 'Third Class' : 'Pass';
  const container = document.getElementById('cgpaResults');
  if (!container) return;
  container.innerHTML = `
    <div class="cgpa-result-card">
      <div class="cgpa-result-grid">
        <div class="cgpa-result-item"><div class="label">Total Credits</div><div class="value">${totalCredits}</div></div>
        <div class="cgpa-result-item"><div class="label">Total Quality Points</div><div class="value">${totalPoints.toFixed(2)}</div></div>
        <div class="cgpa-result-item"><div class="label">CGPA</div><div class="value ${cls}">${cgpa.toFixed(2)}</div></div>
        <div class="cgpa-result-item"><div class="label">Classification</div><div class="value ${cls}">${label}</div></div>
      </div>
    </div>`;
}

/* ══════════════════════════════════════════════════
   NIFES Study Hub — Main Application
   ══════════════════════════════════════════════════ */

/* ─── Supabase Config ─────────────────────────────── */
/* TODO: Replace with your Supabase credentials
   1. Go to supabase.com → create free project
   2. Settings → API → copy Project URL & anon key
   3. Paste below */
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

/* ─── State ──────────────────────────────────────── */
let questions = [];
let materials = [];
let currentLevel = '';
let searchVisible = false;
let studyModeActive = false;
let currentUser = null;

/* Quiz state */
let quizQuestions = [];
let quizIndex = 0;
let quizScore = 0;
let quizMissed = [];
let quizTotal = 0;
let quizActive = false;

/* ─── Init ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async function() {
  initSupabase(SUPABASE_URL, SUPABASE_ANON_KEY);

  dbOnAuthChange(function(event, session) {
    currentUser = session?.user || null;
    updateAuthUI();
  });

  currentUser = await dbGetCurrentUser();
  updateAuthUI();
  await loadAllData();
  renderDashboard();
  updateBadges();
  initTheme();
});

/* ─── Data Loading ────────────────────────────────── */
async function loadAllData() {
  const [qRes, mRes] = await Promise.all([dbFetchQuestions(), dbFetchMaterials()]);
  if (qRes.success) questions = qRes.data;
  if (mRes.success) materials = mRes.data;
}

async function refreshQuestions() {
  const res = await dbFetchQuestions();
  if (res.success) questions = res.data;
}

async function refreshMaterials() {
  const res = await dbFetchMaterials();
  if (res.success) materials = res.data;
}

/* ─── Navigation ──────────────────────────────────── */
function navigate(view) {
  document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
  var el = document.getElementById('view-' + view);
  if (el) el.classList.add('active');

  document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(function(n) { n.classList.remove('active'); });
  var navEl = document.getElementById('nav-' + view);
  var mobEl = document.getElementById('mob-' + view);
  if (navEl) navEl.classList.add('active');
  if (mobEl) mobEl.classList.add('active');

  searchVisible = false;
  var sw = document.getElementById('searchWrap');
  if (sw) sw.style.display = 'none';

  if (view === 'dashboard') renderDashboard();
  if (view === 'practice') initPracticeView();
  if (view === 'calculator') initCalculatorView();
  if (view === 'cgpa') initCGPAView();

  updateBadges();
}

function navigatePQ(level) {
  currentLevel = level;
  navigate('pq');
  var navEl = document.getElementById('nav-' + level);
  var mobEl = document.getElementById('mob-' + level);
  if (navEl) navEl.classList.add('active');
  if (mobEl) mobEl.classList.add('active');
  document.getElementById('pq-title').textContent = level + ' Level Past Questions';
  var count = questions.filter(function(q) { return q.level === level; }).length;
  document.getElementById('pq-subtitle').textContent = count + ' question' + (count !== 1 ? 's' : '') + ' available';
  populateFilters(level);
  renderPQList();
  renderLevelMaterials(level);
}

/* ─── Auth UI ─────────────────────────────────────── */
function updateAuthUI() {
  var container = document.getElementById('authContainer');
  if (!container) return;
  if (currentUser) {
    var name = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User';
    var initial = name.charAt(0).toUpperCase();
    container.innerHTML = '<div class="user-badge" onclick="toggleUserMenu()">' +
      '<div class="user-avatar">' + initial + '</div>' +
      '<span class="user-name">' + name + '</span></div>' +
      '<div class="user-dropdown" id="userDropdown">' +
      '<button onclick="handleSignOut()">Sign Out</button></div>';
  } else {
    container.innerHTML = '<button class="auth-btn" onclick="openAuthModal()">Sign In</button>';
  }
}

function toggleUserMenu() {
  var el = document.getElementById('userDropdown');
  if (el) el.classList.toggle('show');
}

async function handleSignOut() {
  await dbSignOut();
  currentUser = null;
  updateAuthUI();
  var el = document.getElementById('userDropdown');
  if (el) el.classList.remove('show');
}

function openAuthModal() {
  document.getElementById('authModal').classList.add('show');
  switchAuthTab('signin');
}

function closeAuthModal() {
  document.getElementById('authModal').classList.remove('show');
  var errEl = document.getElementById('authError');
  var sucEl = document.getElementById('authSuccess');
  if (errEl) errEl.classList.remove('show');
  if (sucEl) sucEl.classList.remove('show');
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelectorAll('.auth-form').forEach(function(f) { f.classList.remove('active'); });
  hideAuthMessages();
  if (tab === 'signin') {
    var t = document.querySelector('.auth-tab:first-child');
    if (t) t.classList.add('active');
    var f = document.getElementById('signInForm');
    if (f) f.classList.add('active');
  } else {
    var t = document.querySelector('.auth-tab:last-child');
    if (t) t.classList.add('active');
    var f = document.getElementById('signUpForm');
    if (f) f.classList.add('active');
  }
}

function hideAuthMessages() {
  var errEl = document.getElementById('authError');
  var sucEl = document.getElementById('authSuccess');
  if (errEl) { errEl.classList.remove('show'); errEl.textContent = ''; }
  if (sucEl) { sucEl.classList.remove('show'); sucEl.textContent = ''; }
}

async function handleSignIn(e) {
  e.preventDefault();
  var email = document.getElementById('signInEmail').value;
  var password = document.getElementById('signInPassword').value;
  var errorEl = document.getElementById('authError');
  var res = await dbSignIn(email, password);
  if (res.success) {
    currentUser = res.data.user;
    updateAuthUI();
    closeAuthModal();
    document.getElementById('signInForm').reset();
  } else {
    errorEl.textContent = res.error || 'Sign in failed.';
    errorEl.classList.add('show');
  }
}

async function handleSignUp(e) {
  e.preventDefault();
  var name = document.getElementById('signUpName').value;
  var email = document.getElementById('signUpEmail').value;
  var password = document.getElementById('signUpPassword').value;
  var confirm = document.getElementById('signUpConfirm').value;
  var errorEl = document.getElementById('authError');
  var successEl = document.getElementById('authSuccess');

  hideAuthMessages();
  if (password !== confirm) { errorEl.textContent = 'Passwords do not match.'; errorEl.classList.add('show'); return; }
  if (password.length < 6) { errorEl.textContent = 'Password must be at least 6 characters.'; errorEl.classList.add('show'); return; }

  var res = await dbSignUp(email, password, name);
  if (res.success) {
    successEl.textContent = 'Account created! Check your email to confirm.';
    successEl.classList.add('show');
    document.getElementById('signUpForm').reset();
  } else {
    errorEl.textContent = res.error || 'Sign up failed.';
    errorEl.classList.add('show');
  }
}

async function handleGoogleSignIn() {
  await dbSignInWithGoogle();
}

/* ─── Dashboard ───────────────────────────────────── */
function renderDashboard() {
  document.getElementById('kpi-total').textContent = questions.length;
  ['100', '200', '300'].forEach(function(l) {
    var n = questions.filter(function(q) { return q.level === l; }).length;
    document.getElementById('kpi-' + l).textContent = n;
  });

  var courses = {};
  questions.forEach(function(q) {
    var key = q.course + '|' + q.level;
    if (!courses[key]) courses[key] = { course: q.course, code: q.code, level: q.level, count: 0 };
    courses[key].count++;
  });

  var grid = document.getElementById('courseGrid');
  grid.innerHTML = Object.values(courses).map(function(c) {
    var years = [...new Set(questions.filter(function(q) { return q.level === c.level && q.course === c.course; }).map(function(q) { return q.year; }).filter(Boolean))].join(', ') || 'Multiple years';
    return '<div class="course-card" onclick="filterByCourse(\'' + c.level + '\',\'' + c.course.replace(/'/g, "\\'") + '\')">' +
      '<div class="course-card-top"><span class="course-chip chip-' + c.level + '">' + c.level + 'L</span><span class="course-pq-count">' + c.count + ' PQ</span></div>' +
      '<div class="course-title">' + c.course + '</div>' +
      '<div class="course-code">' + (c.code || '') + '</div>' +
      '<div class="course-meta"><span class="course-meta-item">' + years + '</span></div></div>';
  }).join('');

  renderDashboardMaterials();
}

function renderDashboardMaterials() {
  var container = document.getElementById('dashboardMaterials');
  if (!container) return;
  if (!materials.length) { container.innerHTML = ''; return; }
  var recent = materials.slice(0, 6);
  container.innerHTML = '<h2 class="section-heading" style="margin-top:var(--space-8)">Recent Course Materials</h2>' +
    '<div class="material-grid">' + recent.map(renderMaterialCard).join('') + '</div>';
}

function filterByCourse(level, course) {
  navigatePQ(level);
  setTimeout(function() {
    var sel = document.getElementById('filterCourse');
    if (sel) { sel.value = course; renderPQList(); }
  }, 50);
}

/* ─── PQ List ─────────────────────────────────────── */
function populateFilters(level) {
  var lvlQs = questions.filter(function(q) { return q.level === level; });
  var courses = [...new Set(lvlQs.map(function(q) { return q.course; }))];
  var years = [...new Set(lvlQs.map(function(q) { return q.year; }).filter(Boolean))].sort(function(a, b) { return b - a; });

  var cSel = document.getElementById('filterCourse');
  cSel.innerHTML = '<option value="">All Courses</option>' + courses.map(function(c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');

  var ySel = document.getElementById('filterYear');
  ySel.innerHTML = '<option value="">All Years</option>' + years.map(function(y) { return '<option value="' + y + '">' + y + '</option>'; }).join('');

  document.getElementById('filterType').value = '';
}

function renderPQList() {
  var level = currentLevel;
  var course = document.getElementById('filterCourse')?.value || '';
  var year = document.getElementById('filterYear')?.value || '';
  var type = document.getElementById('filterType')?.value || '';

  var filtered = questions.filter(function(q) {
    if (q.level !== level) return false;
    if (course && q.course !== course) return false;
    if (year && q.year !== year) return false;
    if (type && q.type !== type) return false;
    return true;
  });

  var list = document.getElementById('pqList');
  if (!filtered.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div><h3>No questions found</h3><p>Try adjusting your filters or add a new question.</p><button class="btn-primary" onclick="navigate(\'add\')">Add Question</button></div>';
    return;
  }
  list.innerHTML = filtered.map(renderPQItem).join('');
}

function renderPQItem(q) {
  var showAnsBtn = studyModeActive
    ? '<button class="pq-reveal-toggle" onclick="toggleAnswer(' + q.id + ')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Reveal Answer</button>'
    : '<button class="pq-answer-toggle" onclick="toggleAnswer(' + q.id + ')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> Show Answer</button>';

  var courseLabel = q.course + (q.code ? ' (' + q.code + ')' : '');
  var tags = '';
  if (q.year) tags += '<span class="tag tag-year">' + q.year + '</span>';
  if (q.topic) tags += '<span class="tag tag-topic">' + q.topic + '</span>';
  if (q.type) tags += '<span class="tag tag-type">' + q.type + '</span>';

  var answerHtml = q.answer ? showAnsBtn + '<div class="pq-answer" id="ans-' + q.id + '">' + q.answer.replace(/\n/g, '<br>') + '</div>' : '';

  return '<div class="pq-item" id="pq-' + q.id + '">' +
    '<div class="pq-item-header"><div class="pq-meta">' + tags + '</div>' +
    '<span style="font-size:var(--text-xs);color:var(--color-text-faint);white-space:nowrap">' + courseLabel + '</span></div>' +
    '<p class="pq-question">' + q.question + '</p>' + answerHtml + '</div>';
}

function toggleAnswer(id) {
  var ansEl = document.getElementById('ans-' + id);
  var btn = ansEl?.previousElementSibling;
  if (!ansEl) return;
  if (studyModeActive) {
    ansEl.classList.add('show');
    if (btn) btn.style.display = 'none';
    return;
  }
  var isShown = ansEl.classList.toggle('show');
  if (btn) {
    btn.innerHTML = isShown
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg> Hide Answer'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> Show Answer';
  }
}

/* ─── Study Mode ──────────────────────────────────── */
function toggleStudyMode(active) {
  studyModeActive = active;
  document.body.classList.toggle('study-mode', active);
  var banner = document.getElementById('studyBanner');
  if (banner) banner.classList.toggle('show', active);
  renderPQList();
}

/* ─── Level Materials ─────────────────────────────── */
function renderLevelMaterials(level) {
  var container = document.getElementById('levelMaterials');
  if (!container) return;
  var levelMats = materials.filter(function(m) { return m.level === level; });
  if (!levelMats.length) { container.innerHTML = ''; return; }
  container.innerHTML = '<h2 class="section-heading" style="margin-top:var(--space-8)">Course Materials</h2>' +
    '<div class="material-grid">' + levelMats.map(renderMaterialCard).join('') + '</div>';
}

function renderMaterialCard(m) {
  var icons = { 'Past Question PDF': '📄', 'Lecture Note': '📝', 'Textbook': '📚', 'Other': '📎' };
  var sizeStr = m.file_size ? formatFileSize(m.file_size) : '';
  var dateStr = m.created_at ? new Date(m.created_at).toLocaleDateString() : '';
  return '<div class="material-card">' +
    '<div class="material-card-header">' +
    '<div class="material-icon">' + (icons[m.type] || '📄') + '</div>' +
    '<div class="material-info"><div class="material-title" title="' + m.title + '">' + m.title + '</div>' +
    '<div class="material-meta"><span class="tag tag-type">' + m.type + '</span><span>' + m.course + (m.code ? ' (' + m.code + ')' : '') + '</span></div>' +
    '<div class="material-meta" style="margin-top:var(--space-1)">' + (sizeStr ? '<span>' + sizeStr + '</span>' : '') + (dateStr ? '<span>' + dateStr + '</span>' : '') + '</div></div></div>' +
    '<div class="material-footer">' +
    '<button class="btn-primary btn-sm" onclick="window.open(\'' + m.file_url + '\',\'_blank\')">View</button>' +
    '<button class="btn-ghost btn-sm" onclick="downloadMaterial(\'' + m.file_url + '\',\'' + (m.file_name || 'download') + '\')">Download</button></div></div>';
}

function downloadMaterial(url, name) {
  var a = document.createElement('a');
  a.href = url; a.download = name; a.target = '_blank'; a.click();
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

/* ─── Add Question ────────────────────────────────── */
async function handleAddQuestion(e) {
  e.preventDefault();
  if (!currentUser) { openAuthModal(); return; }

  var q = {
    level: document.getElementById('fLevel').value,
    course: document.getElementById('fCourse').value.trim(),
    code: document.getElementById('fCode').value.trim(),
    year: document.getElementById('fYear').value.trim(),
    topic: document.getElementById('fTopic').value.trim(),
    type: document.getElementById('fType').value,
    question: document.getElementById('fQuestion').value.trim(),
    answer: document.getElementById('fAnswer').value.trim(),
  };

  var res = await dbAddQuestion(q);
  if (res.success) {
    e.target.reset();
    showToast('success', 'Question added successfully!');
    await refreshQuestions();
    updateBadges();
  } else {
    showToast('error', res.error || 'Failed to add question.');
  }
}

/* ─── Material Upload ─────────────────────────────── */
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
  document.getElementById('tab-' + tab)?.classList.add('active');
  var tabBtn = document.querySelector('.tab[data-tab="' + tab + '"]');
  if (tabBtn) tabBtn.classList.add('active');
}

function handleFileSelect(e) {
  var file = e.target.files[0];
  var dropZone = document.getElementById('fileDropZone');
  var info = document.getElementById('fileInfo');
  if (!file) return;
  var maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) { showToast('error', 'File too large. Max 10MB.'); e.target.value = ''; return; }
  var validTypes = ['application/pdf', 'image/png', 'image/jpeg'];
  if (!validTypes.includes(file.type)) { showToast('error', 'Invalid type. Only PDF, PNG, JPG.'); e.target.value = ''; return; }
  if (dropZone) dropZone.classList.add('has-file');
  if (info) info.textContent = file.name + ' (' + formatFileSize(file.size) + ')';
}

async function handleUploadMaterial(e) {
  e.preventDefault();
  if (!currentUser) { openAuthModal(); return; }

  var file = document.getElementById('materialFile').files[0];
  if (!file) { showToast('error', 'Please select a file.'); return; }

  var metadata = {
    level: document.getElementById('mLevel').value,
    course: document.getElementById('mCourse').value.trim(),
    code: document.getElementById('mCode').value.trim(),
    title: document.getElementById('mTitle').value.trim(),
    type: document.getElementById('mType').value,
  };

  if (!metadata.level || !metadata.course || !metadata.title) {
    showToast('error', 'Please fill all required fields.');
    return;
  }

  var res = await dbUploadMaterial(file, metadata);
  if (res.success) {
    e.target.reset();
    var dz = document.getElementById('fileDropZone');
    if (dz) dz.classList.remove('has-file');
    var fi = document.getElementById('fileInfo');
    if (fi) fi.textContent = '';
    showToast('success', 'Material uploaded!');
    await refreshMaterials();
  } else {
    showToast('error', res.error || 'Upload failed.');
  }
}

/* ─── Practice Test ───────────────────────────────── */
function initPracticeView() {
  quizActive = false;
  var setup = document.getElementById('quizSetup');
  var engine = document.getElementById('quizEngine');
  var results = document.getElementById('quizResults');
  if (setup) setup.style.display = 'block';
  if (engine) engine.style.display = 'none';
  if (results) results.style.display = 'none';
  populateQuizFilters();
  loadMatricNumber();
}

function loadMatricNumber() {
  var saved = localStorage.getItem('nifes_matric') || '';
  var el = document.getElementById('quizMatric');
  if (el) el.value = saved;
}

function populateQuizFilters() {
  var lSel = document.getElementById('quizLevel');
  lSel.innerHTML = '<option value="">Select Level</option><option value="100">100 Level</option><option value="200">200 Level</option><option value="300">300 Level</option>';
  var cSel = document.getElementById('quizCourse');
  cSel.innerHTML = '<option value="">All Courses</option>';
}

function onQuizLevelChange() {
  var level = document.getElementById('quizLevel').value;
  var cSel = document.getElementById('quizCourse');
  if (!level) { cSel.innerHTML = '<option value="">All Courses</option>'; return; }
  var courses = [...new Set(questions.filter(function(q) { return q.level === level; }).map(function(q) { return q.course; }))];
  cSel.innerHTML = '<option value="">All Courses</option>' + courses.map(function(c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');
}

function startQuiz() {
  var level = document.getElementById('quizLevel').value;
  var course = document.getElementById('quizCourse').value;
  var qCount = document.querySelector('input[name="quizCount"]:checked')?.value || '10';
  var qType = document.getElementById('quizType').value;
  var matric = document.getElementById('quizMatric').value.trim();

  if (!level) { showToast('error', 'Please select a level.'); return; }
  if (matric) localStorage.setItem('nifes_matric', matric);

  var pool = questions.filter(function(q) { return q.level === level && q.answer; });
  if (course) pool = pool.filter(function(q) { return q.course === course; });
  if (qType) pool = pool.filter(function(q) { return q.type === qType; });

  if (!pool.length) { showToast('error', 'No questions available.'); return; }

  pool = shuffleArray(pool);
  var count = qCount === 'all' ? pool.length : Math.min(parseInt(qCount), pool.length);
  quizQuestions = pool.slice(0, count);
  quizIndex = 0;
  quizScore = 0;
  quizMissed = [];
  quizTotal = quizQuestions.length;
  quizActive = true;

  document.getElementById('quizSetup').style.display = 'none';
  document.getElementById('quizEngine').style.display = 'block';
  document.getElementById('quizResults').style.display = 'none';
  showQuizQuestion();
}

function showQuizQuestion() {
  if (quizIndex >= quizTotal) { showQuizResults(); return; }

  var q = quizQuestions[quizIndex];
  document.getElementById('quizProgress').textContent = 'Question ' + (quizIndex + 1) + ' of ' + quizTotal;
  document.getElementById('quizProgressFill').style.width = ((quizIndex / quizTotal) * 100) + '%';
  document.getElementById('quizQuestionNum').textContent = 'Question ' + (quizIndex + 1);
  document.getElementById('quizLevelBadge').textContent = q.level + 'L · ' + q.course;
  document.getElementById('quizQuestionText').textContent = q.question;

  var ansSection = document.getElementById('quizAnswerSection');
  ansSection.classList.remove('show');
  document.getElementById('quizAnswerBox').innerHTML = q.answer.replace(/\n/g, '<br>');
  document.getElementById('quizShowBtn').style.display = '';
  document.getElementById('quizGotIt').style.display = 'none';
  document.getElementById('quizMissedIt').style.display = 'none';
}

function showQuizAnswer() {
  document.getElementById('quizAnswerSection').classList.add('show');
  document.getElementById('quizShowBtn').style.display = 'none';
  document.getElementById('quizGotIt').style.display = '';
  document.getElementById('quizMissedIt').style.display = '';
}

function quizGotIt() { quizScore++; quizIndex++; showQuizQuestion(); }
function quizMissedIt() { quizMissed.push(quizQuestions[quizIndex]); quizIndex++; showQuizQuestion(); }

function showQuizResults() {
  quizActive = false;
  document.getElementById('quizEngine').style.display = 'none';
  document.getElementById('quizResults').style.display = 'block';

  var pct = Math.round((quizScore / quizTotal) * 100);
  document.getElementById('resultScore').textContent = quizScore + ' / ' + quizTotal;

  var pctEl = document.getElementById('resultPct');
  pctEl.textContent = pct + '%';
  pctEl.className = 'quiz-result-pct ' + (pct >= 70 ? 'good' : pct >= 50 ? 'ok' : 'bad');

  var fillEl = document.getElementById('resultFill');
  fillEl.style.width = pct + '%';
  fillEl.style.background = pct >= 70 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-gold)' : 'var(--color-error)';

  var missedContainer = document.getElementById('resultMissed');
  if (quizMissed.length) {
    missedContainer.innerHTML = '<h3 style="margin-bottom:var(--space-4)">Missed Questions (' + quizMissed.length + ')</h3>' +
      quizMissed.map(function(q, i) {
        return '<div class="quiz-missed-item"><p><strong>' + (i + 1) + '.</strong> ' + q.question + '</p>' +
          '<div class="quiz-missed-answer"><strong>Answer:</strong> ' + q.answer.replace(/\n/g, '<br>') + '</div></div>';
      }).join('');
  } else {
    missedContainer.innerHTML = '<p style="color:var(--color-success);font-size:var(--text-base)">Perfect score! No missed questions.</p>';
  }

  document.getElementById('resultRetryBtn').style.display = quizMissed.length ? '' : 'none';

  dbSaveQuizSession({
    matric_number: localStorage.getItem('nifes_matric') || '',
    level: quizQuestions[0]?.level || '',
    course: quizQuestions[0]?.course || '',
    question_type: '',
    score: quizScore,
    total: quizTotal,
    missed_data: quizMissed,
  });
}

function retryMissed() {
  if (!quizMissed.length) return;
  quizQuestions = shuffleArray([...quizMissed]);
  quizIndex = 0; quizScore = 0; quizMissed = [];
  quizTotal = quizQuestions.length; quizActive = true;
  document.getElementById('quizResults').style.display = 'none';
  document.getElementById('quizEngine').style.display = 'block';
  showQuizQuestion();
}

function newTest() { initPracticeView(); }

function shuffleArray(arr) {
  var a = [...arr];
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

/* ─── Search ──────────────────────────────────────── */
function toggleSearch() {
  searchVisible = !searchVisible;
  var wrap = document.getElementById('searchWrap');
  wrap.style.display = searchVisible ? 'block' : 'none';
  if (searchVisible) document.getElementById('searchInput').focus();
}

function handleSearch(val) {
  if (!val.trim()) { navigate('dashboard'); return; }
  var q = val.toLowerCase();
  var results = questions.filter(function(qu) {
    return qu.question.toLowerCase().includes(q) || qu.course.toLowerCase().includes(q) ||
      (qu.topic || '').toLowerCase().includes(q) || (qu.answer || '').toLowerCase().includes(q);
  });
  navigate('search');
  document.getElementById('searchTitle').textContent = '"' + val + '" — ' + results.length + ' result' + (results.length !== 1 ? 's' : '');
  document.getElementById('searchList').innerHTML = results.length
    ? results.map(function(r) { return renderPQItem(r); }).join('')
    : '<div class="empty-state"><div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div><h3>No results found</h3><p>Try different keywords.</p></div>';
}

/* ─── Badges ──────────────────────────────────────── */
function updateBadges() {
  ['100', '200', '300'].forEach(function(l) {
    var n = questions.filter(function(q) { return q.level === l; }).length;
    var el = document.getElementById('badge-' + l);
    if (el) el.textContent = n;
  });
}

/* ─── Toast ───────────────────────────────────────── */
function showToast(type, message) {
  var id = type === 'error' ? 'errorToast' : 'successToast';
  var el = document.getElementById(id);
  if (!el) return;
  var span = el.querySelector('span');
  if (span) span.textContent = message;
  el.classList.add('show');
  setTimeout(function() { el.classList.remove('show'); }, 3500);
}

/* ─── Theme ───────────────────────────────────────── */
function initTheme() {
  var saved = localStorage.getItem('nifes_theme');
  var prefersDark = matchMedia('(prefers-color-scheme: dark)').matches;
  var theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcon(theme);
}

function toggleTheme() {
  var r = document.documentElement;
  var current = r.getAttribute('data-theme');
  var next = current === 'dark' ? 'light' : 'dark';
  r.setAttribute('data-theme', next);
  localStorage.setItem('nifes_theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  var btn = document.querySelector('[data-theme-toggle]');
  if (!btn) return;
  btn.innerHTML = theme === 'dark'
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  btn.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode');
}

/* ─── Mobile Drawer ──────────────────────────────── */
function toggleMoreDrawer() {
  var drawer = document.getElementById('moreDrawer');
  var overlay = document.getElementById('drawerOverlay');
  var isOpen = drawer?.classList.contains('show');
  if (drawer) drawer.classList.toggle('show', !isOpen);
  if (overlay) overlay.classList.toggle('show', !isOpen);
}

function closeMoreDrawer() {
  var drawer = document.getElementById('moreDrawer');
  var overlay = document.getElementById('drawerOverlay');
  if (drawer) drawer.classList.remove('show');
  if (overlay) overlay.classList.remove('show');
}

function drawerNav(view) {
  closeMoreDrawer();
  navigate(view);
}
