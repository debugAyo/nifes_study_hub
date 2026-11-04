/* ══════════════════════════════════════════════════
   NIFES Study Hub — Main Application (UI Layer)
   ══════════════════════════════════════════════════ */

/* ─── Password Toggle ─────────────────────────────── */
function togglePasswordVisibility(inputId, btn) {
  var input = document.getElementById(inputId);
  if (!input) return;
  var isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  var svg = btn.querySelector('svg');
  if (svg) {
    svg.innerHTML = isPassword
      ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
      : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  }
}

/* ─── Sanitize ────────────────────────────────────── */
function sanitize(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/* ─── Loading Helpers ────────────────────────────── */
function showPageLoading() {
  var el = document.getElementById('loadingOverlay');
  if (el) el.classList.remove('hidden');
}

function hidePageLoading() {
  var el = document.getElementById('loadingOverlay');
  if (el) el.classList.add('hidden');
}

function showContainerLoading(containerId) {
  var el = document.getElementById(containerId);
  if (el) el.innerHTML = '<div class="loading"><div class="spinner"></div><span>Loading…</span></div>';
}

/* ─── State ──────────────────────────────────────── */
var questions = [];
var materials = [];
var currentLevel = '';
var searchVisible = false;
var studyModeActive = false;
var currentUser = null;
var currentUserRole = 'user';
var bookmarkedIds = {};
var bookmarkFilterActive = false;
var pqPage = 1;
var perPage = 20;

var quizQuestions = [];
var quizIndex = 0;
var quizScore = 0;
var quizSelectedOption = '';
var quizMissed = [];
var quizTotal = 0;
var quizActive = false;
var quizMode = 'exam'; // 'exam' | 'practice'
var quizDurationMins = 15;
var quizTimeLeft = 0;
var quizTimerId = null;
var quizUserAnswers = []; // [qIndex] -> 'A' | 'B' | 'C' | 'D' | null
var quizFlagged = []; // [qIndex] -> boolean
var quizStartTime = 0;
var quizEndTime = 0;
var currentReviewFilter = 'all';
var deferredPWAInstallPrompt = null;

/* ─── Init ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async function() {
  initSupabase(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 1. Service Worker Registration (PWA Offline Capability)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(function(reg) {
      console.log('[PWA] Service Worker registered:', reg.scope);
    }).catch(function(err) {
      console.warn('[PWA] Service Worker registration failed:', err);
    });
  }

  // 2. Real-Time Network Status Indicator
  function updateNetworkStatus() {
    var badge = document.getElementById('networkStatusBadge');
    if (!badge) return;
    if (navigator.onLine) {
      badge.className = 'network-badge online';
      var textEl = badge.querySelector('.network-text');
      if (textEl) textEl.textContent = 'Online';
      badge.title = 'Connected to network';
    } else {
      badge.className = 'network-badge offline';
      var textEl = badge.querySelector('.network-text');
      if (textEl) textEl.textContent = 'Offline';
      badge.title = 'Offline: Local cached questions & study tools are active';
      showToast('info', 'Working in Offline Mode. Local study questions and tools are available.');
    }
  }
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();

  // 3. PWA Install Prompt Listener
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPWAInstallPrompt = e;
    var btn = document.getElementById('pwaInstallBtn');
    if (btn) btn.style.display = 'inline-flex';
  });

  // Security & state hygiene: purge any legacy guest mode flag from previous versions
  localStorage.removeItem('nifes_guest_mode');

  dbOnAuthChange(function(event, session) {
    currentUser = session?.user || null;
    updateAuthUI();
  });

  currentUser = await dbGetCurrentUser();

  updateAuthUI();
  initTheme();

  if (window.location.hash === '#signup') {
    switchAuthTab('signup');
  } else if (window.location.hash === '#signin') {
    switchAuthTab('signin');
  }

  if (currentUser) {
    hideAuthPage();
  } else {
    showAuthPage();
  }
});

/* ─── Data Loading ────────────────────────────────── */
async function loadAllData() {
  var results = await Promise.all([dbFetchQuestions(), dbFetchMaterials()]);
  if (results[0].success && results[0].data.length) questions = results[0].data;
  else questions = SEED_QUESTIONS;
  if (results[1].success) materials = results[1].data;
}

async function refreshQuestions() {
  var res = await dbFetchQuestions();
  if (res.success) questions = res.data;
}

async function refreshMaterials() {
  var res = await dbFetchMaterials();
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
  if (view === 'pomodoro') initPomodoroView();
  if (view === 'calculator') initCalculatorView();
  if (view === 'cgpa') initCGPAView();
  if (view === 'materials') renderMaterialsView();
  if (view === 'profile') renderProfileView();
  if (view === 'admin') renderAdminView();
  updateBadges();
}

function navigatePQ(level) {
  currentLevel = level;
  pqPage = 1;
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

/* ─── Form Validation ──────────────────────────────── */
function validateField(el) {
  if (!el) return;
  el.classList.remove('success', 'error');
  if (el.checkValidity()) el.classList.add('success');
  else el.classList.add('error');
}
function resetFieldValidation(el) {
  if (!el) return;
  el.classList.remove('error', 'success');
}

/* ─── Auth UI ─────────────────────────────────────── */
function updateAuthUI() {
  var container = document.getElementById('authContainer');
  if (!container) return;
  if (currentUser) {
    var name = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User';
    var initial = name.charAt(0).toUpperCase();
    var safeName = sanitize(name);
    var adminLink = currentUserRole === 'admin' || currentUserRole === 'superuser'
      ? '<button onclick="navigate(\'admin\');toggleUserMenu()">Admin Panel</button>' : '';
    container.innerHTML = '<div class="user-badge" onclick="toggleUserMenu()">' +
      '<div class="user-avatar">' + sanitize(initial) + '</div>' +
      '<span class="user-name">' + safeName + '</span></div>' +
      '<div class="user-dropdown" id="userDropdown">' +
      '<button onclick="navigate(\'profile\');toggleUserMenu()">My Profile</button>' +
      adminLink +
      '<button onclick="handleSignOut()">Sign Out</button></div>';
  } else {
    container.innerHTML = '<button class="auth-btn" onclick="closeAuthModal()">Sign In</button>';
  }
}

function toggleUserMenu() {
  var el = document.getElementById('userDropdown');
  if (el) el.classList.toggle('show');
}

async function handleSignOut() {
  localStorage.removeItem('nifes_guest_mode');
  await dbSignOut();
  currentUser = null;
  currentUserRole = 'user';
  bookmarkedIds = {};
  updateAuthUI();
  var el = document.getElementById('userDropdown');
  if (el) el.classList.remove('show');
  window.location.href = '../index.html';
}

function showAuthPage() {
  document.getElementById('authPage').classList.remove('hidden');
  document.getElementById('appContainer').style.display = 'none';
  switchAuthTab('signin');
}

async function hideAuthPage() {
  showPageLoading();
  document.getElementById('authPage').classList.add('hidden');
  document.getElementById('appContainer').style.display = '';
  updateAuthUI();
  if (currentUser) {
    var pRes = await dbGetProfile(currentUser.id);
    currentUserRole = pRes.data?.role || 'user';
    var bRes = await dbFetchBookmarks();
    if (bRes.success) {
      bookmarkedIds = {};
      bRes.data.forEach(function(b) { bookmarkedIds[b.question_id] = true; });
    }
    var adminNav = document.getElementById('navAdminSection');
    if (adminNav) adminNav.style.display = currentUserRole === 'admin' || currentUserRole === 'superuser' ? '' : 'none';
  }
  await loadAllData();
  renderDashboard();
  updateBadges();
  hidePageLoading();
}

function closeAuthModal() {
  window.location.href = '../index.html';
}

function renderProfileView() {
  if (!currentUser) return;
  var name = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User';
  var initial = name.charAt(0).toUpperCase();
  document.getElementById('profileAvatar').innerHTML = '<div class="profile-avatar-circle">' + sanitize(initial) + '</div>';
  document.getElementById('profileName').textContent = sanitize(name);
  document.getElementById('profileEmail').textContent = currentUser.email || '';
  document.getElementById('profileRole').textContent = 'Role: ' + currentUserRole;

  var myQs = questions.filter(function(q) { return q.user_id === currentUser.id; });
  document.getElementById('profileStats').innerHTML =
    '<div class="profile-stat"><strong>' + myQs.length + '</strong> questions contributed</div>';

  var list = document.getElementById('myQuestionsList');
  if (myQs.length) {
    list.innerHTML = myQs.map(function(q) {
      return '<div class="pq-item"><div class="pq-item-header"><div class="pq-meta"><span class="tag tag-type">' + sanitize(q.type) + '</span></div>' +
        '<span style="font-size:var(--text-xs);color:var(--color-text-faint)">' + sanitize(q.course) + '</span></div>' +
        '<p class="pq-question">' + sanitize(q.question) + '</p></div>';
    }).join('');
  } else {
    list.innerHTML = '<div class="empty-state"><h3>No questions yet</h3><p>Contribute a question from the Add Question page.</p></div>';
  }
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
  var fErr = document.getElementById('forgotError');
  var fSuc = document.getElementById('forgotSuccess');
  if (fErr) { fErr.classList.remove('show'); fErr.textContent = ''; }
  if (fSuc) { fSuc.classList.remove('show'); fSuc.textContent = ''; }
}

function showForgotPassword() {
  hideAuthMessages();
  document.getElementById('signInForm').classList.remove('active');
  document.getElementById('forgotForm').style.display = 'block';
}
function closeForgotPassword() {
  hideAuthMessages();
  document.getElementById('forgotForm').style.display = 'none';
  document.getElementById('signInForm').classList.add('active');
}

async function handleForgotPassword() {
  var email = document.getElementById('forgotEmail').value;
  var errEl = document.getElementById('forgotError');
  var sucEl = document.getElementById('forgotSuccess');
  hideAuthMessages();
  if (!email) { errEl.textContent = 'Please enter your email.'; errEl.classList.add('show'); return; }
  var res = await dbResetPassword(email);
  if (res.success) {
    sucEl.textContent = 'Reset link sent! Check your email (and spam).';
    sucEl.classList.add('show');
  } else {
    errEl.textContent = res.error || 'Failed to send reset link.';
    errEl.classList.add('show');
  }
}

async function handleSignIn(e) {
  e.preventDefault();
  var email = (document.getElementById('signInEmail').value || '').trim();
  var password = (document.getElementById('signInPassword').value || '').trim();
  var errorEl = document.getElementById('authError');
  hideAuthMessages();

  if (!email) {
    errorEl.textContent = 'Please enter your registered email address.';
    errorEl.classList.add('show');
    return;
  }
  if (!password) {
    errorEl.textContent = 'Password is required to sign in.';
    errorEl.classList.add('show');
    return;
  }
  if (password.length < 6) {
    errorEl.textContent = 'Password must be at least 6 characters.';
    errorEl.classList.add('show');
    return;
  }

  var res = await dbSignIn(email, password);
  if (res.success) {
    if (!res.data.user?.email_confirmed_at) {
      errorEl.textContent = 'Email not yet confirmed. Check your inbox (and spam) for the confirmation link.';
      errorEl.classList.add('show');
      return;
    }
    currentUser = res.data.user;
    updateAuthUI();
    hideAuthPage();
    document.getElementById('signInForm').reset();
  } else {
    var msg = res.error || 'Sign in failed.';
    if (msg.toLowerCase().includes('email not confirmed')) {
      msg = 'Email not confirmed. Check your inbox (and spam) for the confirmation link.';
    }
    errorEl.textContent = msg;
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
  if (password.length < 8) { errorEl.textContent = 'Password must be at least 8 characters.'; errorEl.classList.add('show'); return; }

  var res = await dbSignUp(email, password, name);
  if (res.success) {
    document.getElementById('signUpForm').reset();
    switchAuthTab('signin');
    var msg = res.data?.user?.identities?.length === 0
      ? 'This email is already registered. Try signing in.'
      : 'Account created! Check your email to confirm (check spam too). After confirming, sign in below.';
    successEl.textContent = msg;
    successEl.classList.add('show');
  } else {
    errorEl.textContent = res.error || 'Sign up failed.';
    errorEl.classList.add('show');
  }
}

async function handleGoogleSignIn() {
  await dbSignInWithGoogle();
}

/* ─── Admin View ──────────────────────────────────── */
function renderAdminView() {
  renderAdminUsers();
}

function switchAdminTab(tab) {
  document.querySelectorAll('#view-admin .tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelectorAll('#view-admin .tab-content').forEach(function(c) { c.classList.remove('active'); });
  var tabBtn = document.querySelector('#view-admin .tab[data-tab="admin-' + tab + '"]');
  if (tabBtn) tabBtn.classList.add('active');
  document.getElementById('tab-admin-' + tab).classList.add('active');
  if (tab === 'users') renderAdminUsers();
  if (tab === 'questions') renderAdminQuestions();
  if (tab === 'materials') renderAdminMaterials();
}

function renderAdminUsers() {
  var list = document.getElementById('adminUsersList');
  if (!list) return;
  showContainerLoading('adminUsersList');
  dbFetchAllUsers().then(function(res) {
    if (!res.success || !res.data.length) {
      list.innerHTML = '<div class="empty-state"><h3>No users found</h3></div>';
      return;
    }
    list.innerHTML = '<table class="admin-table"><thead><tr><th>Name</th><th>Role</th><th>Joined</th><th>Questions</th><th>Action</th></tr></thead><tbody>' +
      res.data.map(function(u) {
        var date = u.created_at ? new Date(u.created_at).toLocaleDateString() : '-';
        var canChange = currentUserRole === 'superuser' && u.id !== currentUser.id;
        var roleOpts = ['user', 'admin', 'superuser'].map(function(r) {
          return '<option value="' + r + '"' + (u.role === r ? ' selected' : '') + '>' + r + '</option>';
        }).join('');
        return '<tr><td>' + sanitize(u.full_name || 'Unknown') + '</td>' +
          '<td>' + sanitize(u.role) + '</td>' +
          '<td>' + date + '</td>' +
          '<td>' + u.question_count + '</td>' +
          '<td>' + (canChange ? '<select onchange="dbUpdateUserRole(\'' + u.id + '\',this.value).then(function(r){if(r.success)showToast(\'success\',\'Role updated\');})">' + roleOpts + '</select>' : '-') + '</td></tr>';
      }).join('') + '</tbody></table>';
  });
}

function renderAdminQuestions() {
  var list = document.getElementById('adminQuestionsList');
  if (!list) return;
  if (!questions.length) {
    list.innerHTML = '<div class="empty-state"><h3>No questions</h3></div>';
    return;
  }
  list.innerHTML = '<div class="admin-items">' + questions.map(function(q) {
    return '<div class="admin-item"><div class="admin-item-info"><strong>' + sanitize(q.course) + '</strong> — ' + sanitize(q.question.substring(0, 100)) + (q.question.length > 100 ? '…' : '') + '</div>' +
      '<div class="admin-item-actions"><span class="tag tag-type">' + sanitize(q.level) + 'L</span>' +
      '<button class="btn-icon btn-icon-sm" onclick="showEditQuestion(' + q.id + ')" title="Edit">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>' +
      '<button class="btn-icon btn-icon-sm" onclick="confirmDeleteQuestion(' + q.id + ')" title="Delete">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></div></div>';
  }).join('') + '</div>';
}

function renderAdminMaterials() {
  var list = document.getElementById('adminMaterialsList');
  if (!list) return;
  if (!materials.length) {
    list.innerHTML = '<div class="empty-state"><h3>No materials</h3></div>';
    return;
  }
  list.innerHTML = '<div class="admin-items">' + materials.map(function(m) {
    return '<div class="admin-item"><div class="admin-item-info"><strong>' + sanitize(m.title) + '</strong> — ' + sanitize(m.course) + ' · ' + sanitize(m.type) + '</div>' +
      '<div class="admin-item-actions">' +
      '<button class="btn-icon btn-icon-sm" onclick="if(confirm(\'Delete this material?\')){dbDeleteMaterial(' + m.id + ').then(function(r){if(r.success){showToast(\'success\',\'Material deleted\');refreshMaterials().then(function(){renderAdminMaterials();});}})}" title="Delete">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></div></div>';
  }).join('') + '</div>';
}

/* ─── Dashboard ───────────────────────────────────── */
function renderDashboard() {
  var h = new Date().getHours();
  var g = document.getElementById('dashGreeting');
  if (g) g.textContent = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

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
    return '<div class="course-card" onclick="filterByCourse(\'' + c.level + '\',\'' + sanitize(c.course).replace(/'/g, "\\'") + '\')">' +
      '<div class="course-card-top"><span class="course-chip chip-' + c.level + '">' + c.level + 'L</span><span class="course-pq-count">' + c.count + ' PQ</span></div>' +
      '<div class="course-title">' + sanitize(c.course) + '</div>' +
      '<div class="course-code">' + sanitize(c.code || '') + '</div>' +
      '<div class="course-meta"><span class="course-meta-item">' + sanitize(years) + '</span></div></div>';
  }).join('');
  renderDashboardMaterials();
  renderQuizHistory();
}

function renderQuizHistory() {
  var section = document.getElementById('quizHistorySection');
  var list = document.getElementById('quizHistoryList');
  if (!section || !list) return;
  dbFetchQuizSessions(5).then(function(res) {
    if (!res.success || !res.data || !res.data.length) { section.style.display = 'none'; return; }
    section.style.display = '';
    list.innerHTML = res.data.map(function(s) {
      var pct = Math.round((s.score / s.total) * 100);
      var date = new Date(s.created_at).toLocaleDateString();
      var cls = pct >= 70 ? 'good' : pct >= 50 ? 'ok' : 'bad';
      var missedCount = s.missed_data ? s.missed_data.length : s.total - s.score;
      return '<div class="quiz-history-item">' +
        '<div class="quiz-history-info"><div class="quiz-history-course">' + sanitize(s.course) + ' (' + sanitize(s.level) + 'L)' + '</div>' +
        '<div class="quiz-history-date">' + date + '</div></div>' +
        '<div class="quiz-history-score"><div class="quiz-history-pct ' + cls + '">' + pct + '%</div>' +
        '<div class="quiz-history-detail">' + s.score + '/' + s.total + ' · ' + missedCount + ' missed</div></div></div>';
    }).join('');
  });
}

function renderDashboardMaterials() {
  var container = document.getElementById('dashboardMaterials');
  if (!container) return;
  if (!materials.length) { container.innerHTML = ''; return; }
  var recent = materials.slice(0, 6);
  container.innerHTML = '<div style="margin-top:var(--space-10)">' +
    '<h2 class="section-heading">Recent Course Materials</h2>' +
    '<p class="section-desc">Lecture notes, PDFs, and study guides shared by students.</p>' +
    '<div class="material-grid" style="margin-top:var(--space-5)">' + recent.map(renderMaterialCard).join('') + '</div></div>';
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
  cSel.innerHTML = '<option value="">All Courses</option>' + courses.map(function(c) { return '<option value="' + sanitize(c) + '">' + sanitize(c) + '</option>'; }).join('');

  var ySel = document.getElementById('filterYear');
  ySel.innerHTML = '<option value="">All Years</option>' + years.map(function(y) { return '<option value="' + sanitize(y) + '">' + sanitize(y) + '</option>'; }).join('');

  document.getElementById('filterType').value = '';
}

function renderPQList() {
  pqPage = 1;
  renderPQListPage();
}

function renderPQListPage() {
  var level = currentLevel;
  var course = document.getElementById('filterCourse')?.value || '';
  var year = document.getElementById('filterYear')?.value || '';
  var type = document.getElementById('filterType')?.value || '';

  var filtered = questions.filter(function(q) {
    if (q.level !== level) return false;
    if (course && q.course !== course) return false;
    if (year && q.year !== year) return false;
    if (type && q.type !== type) return false;
    if (bookmarkFilterActive && !bookmarkedIds[q.id]) return false;
    return true;
  });

  var list = document.getElementById('pqList');
  if (!filtered.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div><h3>No questions found</h3><p>Try adjusting your filters or add a new question.</p><button class="btn-primary" onclick="navigate(\'add\')">Add Question</button></div>';
    document.getElementById('loadMoreWrap').style.display = 'none';
    return;
  }

  var start = 0;
  var end = pqPage * perPage;
  var pageItems = filtered.slice(start, end);

  list.innerHTML = pageItems.map(renderPQItem).join('');

  var loadMore = document.getElementById('loadMoreWrap');
  if (end < filtered.length) {
    loadMore.style.display = '';
    document.getElementById('loadMoreBtn').textContent = 'Show ' + (filtered.length - end) + ' more questions';
  } else {
    loadMore.style.display = 'none';
  }
}

function loadMoreQuestions() {
  pqPage++;
  renderPQListPage();
}

function renderPQItem(q) {
  var showAnsBtn = studyModeActive
    ? '<button class="pq-reveal-toggle" onclick="toggleAnswer(' + q.id + ')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Reveal Answer</button>'
    : '<button class="pq-answer-toggle" onclick="toggleAnswer(' + q.id + ')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> Show Answer</button>';

  var courseLabel = sanitize(q.course) + (q.code ? ' (' + sanitize(q.code) + ')' : '');
  var tags = '';
  if (q.year) tags += '<span class="tag tag-year">' + sanitize(q.year) + '</span>';
  if (q.topic) tags += '<span class="tag tag-topic">' + sanitize(q.topic) + '</span>';
  if (q.type) tags += '<span class="tag tag-type">' + sanitize(q.type) + '</span>';

  var mcqHtml = renderMCQOptions(q);
  var answerContent = mcqHtml || sanitize(q.answer).replace(/\n/g, '<br>');
  var answerHtml = q.answer ? showAnsBtn + '<div class="pq-answer" id="ans-' + q.id + '">' + answerContent + '</div>' : '';

  // Action buttons (edit/delete) for owner or admin/superuser
  var actions = '';
  var canEdit = currentUser && (currentUser.id === q.user_id || currentUserRole === 'admin' || currentUserRole === 'superuser');
  if (canEdit) {
    actions = '<div class="pq-actions">' +
      '<button class="btn-icon btn-icon-sm" onclick="showEditQuestion(' + q.id + ')" title="Edit question">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>' +
      '<button class="btn-icon btn-icon-sm" onclick="confirmDeleteQuestion(' + q.id + ')" title="Delete question">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button></div>';
  }

  var isBookmarked = bookmarkedIds[q.id];
  var bookmarkBtn = '<button class="pq-bookmark' + (isBookmarked ? ' bookmarked' : '') + '" onclick="toggleBookmark(' + q.id + ')" title="Bookmark">' +
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="' + (isBookmarked ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></button>';

  return '<div class="pq-item" id="pq-' + q.id + '">' +
    '<div class="pq-item-header"><div class="pq-meta">' + tags + '</div>' +
    '<span style="display:flex;align-items:center;gap:var(--space-1)">' + bookmarkBtn +
    '<span style="font-size:var(--text-xs);color:var(--color-text-faint);white-space:nowrap">' + courseLabel + '</span></span></div>' +
    '<p class="pq-question">' + sanitize(q.question) + '</p>' + answerHtml +
    actions + '</div>';
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

/* ─── Edit / Delete Questions ─────────────────────── */
function showEditQuestion(id) {
  var q = questions.find(function(x) { return x.id === id; });
  if (!q) return;
  document.getElementById('editQuestionId').value = q.id;
  document.getElementById('editLevel').value = q.level;
  document.getElementById('editCourse').value = q.course;
  document.getElementById('editCode').value = q.code || '';
  document.getElementById('editYear').value = q.year || '';
  document.getElementById('editTopic').value = q.topic || '';
  document.getElementById('editType').value = q.type || 'Theory';
  document.getElementById('editQuestion').value = q.question;
  onEditTypeChange();

  var parsed = extractMCQ(q);
  if (parsed) {
    document.getElementById('editOptA').value = parsed.options.A || '';
    document.getElementById('editOptB').value = parsed.options.B || '';
    document.getElementById('editOptC').value = parsed.options.C || '';
    document.getElementById('editOptD').value = parsed.options.D || '';
    document.getElementById('editCorrect').value = parsed.correct || '';
  } else {
    document.getElementById('editAnswer').value = q.answer || '';
  }

  document.getElementById('editModalOverlay').classList.remove('hidden');
  document.getElementById('editModal').classList.remove('hidden');
}

function onEditTypeChange() {
  var type = document.getElementById('editType').value;
  var mcqDiv = document.getElementById('editMcqOptions');
  var answerGroup = document.getElementById('editAnswerGroup');
  if (type === 'MCQ') {
    mcqDiv.style.display = 'block';
    answerGroup.style.display = 'none';
  } else {
    mcqDiv.style.display = 'none';
    answerGroup.style.display = '';
  }
}

function closeEditModal() {
  document.getElementById('editModalOverlay').classList.add('hidden');
  document.getElementById('editModal').classList.add('hidden');
}

async function handleEditQuestion(e) {
  e.preventDefault();
  var id = parseInt(document.getElementById('editQuestionId').value);
  var type = document.getElementById('editType').value;
  var answer;
  if (type === 'MCQ') {
    var options = {};
    options.A = document.getElementById('editOptA').value.trim();
    options.B = document.getElementById('editOptB').value.trim();
    options.C = document.getElementById('editOptC').value.trim();
    options.D = document.getElementById('editOptD').value.trim();
    var correct = document.getElementById('editCorrect').value;
    if (!options.A || !options.B || !options.C || !options.D || !correct) {
      showToast('error', 'Please fill all MCQ options and select the correct answer.');
      return;
    }
    answer = JSON.stringify({ correct: correct, options: options });
  } else {
    answer = document.getElementById('editAnswer').value.trim();
  }

  var data = {
    level: document.getElementById('editLevel').value,
    course: document.getElementById('editCourse').value.trim(),
    code: document.getElementById('editCode').value.trim(),
    year: document.getElementById('editYear').value.trim(),
    topic: document.getElementById('editTopic').value.trim(),
    type: type,
    question: document.getElementById('editQuestion').value.trim(),
    answer: answer,
  };

  var res = await dbUpdateQuestion(id, data);
  if (res.success) {
    closeEditModal();
    showToast('success', 'Question updated!');
    await refreshQuestions();
    renderPQList();
    updateBadges();
  } else {
    showToast('error', res.error || 'Failed to update question.');
  }
}

function confirmDeleteQuestion(id) {
  var q = questions.find(function(x) { return x.id === id; });
  if (!q) return;
  if (!confirm('Delete this question?\n\n"' + q.question.substring(0, 80) + (q.question.length > 80 ? '…' : '') + '"')) return;
  dbDeleteQuestion(id).then(function(res) {
    if (res.success) {
      showToast('success', 'Question deleted.');
      refreshQuestions().then(function() { renderPQList(); updateBadges(); });
    } else {
      showToast('error', res.error || 'Failed to delete.');
    }
  });
}

/* ─── Bookmarks ──────────────────────────────────── */
function toggleBookmarkFilter(active) {
  bookmarkFilterActive = active;
  renderPQList();
}

async function toggleBookmark(questionId) {
  var res = await dbToggleBookmark(questionId);
  if (res.success) {
    bookmarkedIds[questionId] = res.bookmarked;
    var btn = document.querySelector('#pq-' + questionId + ' .pq-bookmark');
    if (btn) {
      btn.classList.toggle('bookmarked', res.bookmarked);
      btn.querySelector('svg').setAttribute('fill', res.bookmarked ? 'currentColor' : 'none');
    }
    showToast('success', res.bookmarked ? 'Bookmarked!' : 'Removed bookmark.');
  } else {
    showToast('error', res.error || 'Failed to toggle bookmark.');
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
  var pqPdfs = levelMats.filter(function(m) { return m.type === 'Past Question PDF'; });
  var others = levelMats.filter(function(m) { return m.type !== 'Past Question PDF'; });
  var html = '';
  if (pqPdfs.length) {
    html += '<h2 class="section-heading" style="margin-top:var(--space-8)">Past Question PDFs</h2>' +
      '<div class="material-grid">' + pqPdfs.map(renderMaterialCard).join('') + '</div>';
  }
  if (others.length) {
    html += '<h2 class="section-heading" style="margin-top:var(--space-8)">Other Materials</h2>' +
      '<div class="material-grid">' + others.map(renderMaterialCard).join('') + '</div>';
  }
  container.innerHTML = html;
}

function renderMaterialCard(m) {
  var icons = { 'Past Question PDF': '📄', 'Lecture Note': '📝', 'Textbook': '📚', 'Other': '📎' };
  var sizeStr = m.file_size ? formatFileSize(m.file_size) : '';
  var dateStr = m.created_at ? new Date(m.created_at).toLocaleDateString() : '';
  var safeTitle = sanitize(m.title);
  var safeType = sanitize(m.type);
  var safeCourse = sanitize(m.course);
  var safeCode = m.code ? sanitize(m.code) : '';
  var safeUrl = sanitize(m.file_url);
  var safeFileName = sanitize(m.file_name || 'download');
  return '<div class="material-card">' +
    '<div class="material-card-header">' +
    '<div class="material-icon">' + (icons[m.type] || '📄') + '</div>' +
    '<div class="material-info"><div class="material-title" title="' + safeTitle + '">' + safeTitle + '</div>' +
    '<div class="material-meta"><span class="tag tag-type">' + safeType + '</span><span class="tag tag-type">' + sanitize(m.level) + 'L</span><span>' + safeCourse + (m.code ? ' (' + safeCode + ')' : '') + '</span></div>' +
    '<div class="material-meta" style="margin-top:var(--space-1)">' + (sizeStr ? '<span>' + sizeStr + '</span>' : '') + (dateStr ? '<span>' + dateStr + '</span>' : '') + '</div></div></div>' +
    '<div class="material-footer">' +
    '<button class="btn-primary btn-sm" onclick="window.open(\'' + safeUrl + '\',\'_blank\')">View</button>' +
    '<button class="btn-ghost btn-sm" onclick="downloadMaterial(\'' + safeUrl + '\',\'' + safeFileName + '\')">Download</button></div></div>';
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
function onTypeChange() {
  var type = document.getElementById('fType').value;
  var mcqDiv = document.getElementById('mcqOptions');
  var answerGroup = document.getElementById('answerGroup');
  if (type === 'MCQ') {
    mcqDiv.style.display = 'block';
    answerGroup.style.display = 'none';
    document.getElementById('fAnswer').removeAttribute('required');
  } else {
    mcqDiv.style.display = 'none';
    answerGroup.style.display = '';
  }
}

async function handleAddQuestion(e) {
  e.preventDefault();
  if (!currentUser) { closeAuthModal(); return; }

  var type = document.getElementById('fType').value;
  var answer;
  if (type === 'MCQ') {
    var options = {};
    options.A = document.getElementById('fOptA').value.trim();
    options.B = document.getElementById('fOptB').value.trim();
    options.C = document.getElementById('fOptC').value.trim();
    options.D = document.getElementById('fOptD').value.trim();
    var correct = document.getElementById('fCorrect').value;
    if (!options.A || !options.B || !options.C || !options.D || !correct) {
      showToast('error', 'Please fill all MCQ options and select the correct answer.');
      return;
    }
    answer = JSON.stringify({ correct: correct, options: options });
  } else {
    answer = document.getElementById('fAnswer').value.trim();
  }

  var q = {
    level: document.getElementById('fLevel').value,
    course: document.getElementById('fCourse').value.trim(),
    code: document.getElementById('fCode').value.trim(),
    year: document.getElementById('fYear').value.trim(),
    topic: document.getElementById('fTopic').value.trim(),
    type: type,
    question: document.getElementById('fQuestion').value.trim(),
    answer: answer,
  };

  var res = await dbAddQuestion(q);
  if (res.success) {
    e.target.reset();
    onTypeChange();
    showToast('success', 'Question added successfully!');
    await refreshQuestions();
    updateBadges();
  } else {
    showToast('error', res.error || 'Failed to add question.');
  }
}

/* ─── PDF Extract ──────────────────────────────────── */
var extractedQuestions = [];

function handleExtractFileSelect(e) {
  var file = e.target.files[0];
  if (!file) return;
  document.getElementById('extractDropZone').classList.add('has-file');
  document.getElementById('extractFileInfo').textContent = file.name;
}

async function handleExtractPDF(e) {
  e.preventDefault();
  var file = document.getElementById('extractFile').files[0];
  var level = document.getElementById('eLevel').value;
  var course = document.getElementById('eCourse').value.trim();
  var code = document.getElementById('eCode').value.trim();
  var year = document.getElementById('eYear').value.trim();

  if (!file) { showToast('error', 'Please select a PDF file.'); return; }
  if (!level || !course) { showToast('error', 'Please fill level and course.'); return; }

  var btn = document.getElementById('extractBtn');
  btn.disabled = true;
  btn.textContent = 'Extracting…';

  try {
    var formData = new FormData();
    formData.append('pdf', file);

    var token = await dbGetAuthToken();
    var res = await fetch(SERVER_URL + '/api/extract', {
      method: 'POST',
      headers: token ? { 'Authorization': 'Bearer ' + token } : {},
      body: formData,
    });
    var data = await res.json();

    if (!data.success) throw new Error(data.error || 'Extraction failed');

    extractedQuestions = data.questions.map(function(q) {
      q._level = level;
      q._course = course;
      q._code = code;
      q._year = year;
      return q;
    });

    renderExtractedResults(data);
  } catch (err) {
    showToast('error', 'Extraction error: ' + err.message);
  }

  btn.disabled = false;
  btn.textContent = 'Extract Questions';
}

function renderExtractedResults(data) {
  var container = document.getElementById('extractResults');
  container.style.display = 'block';

  document.getElementById('extractSummary').innerHTML =
    '<span>📄 <strong>' + sanitize(data.fileName) + '</strong> — ' + data.questionsCount + ' question' + (data.questionsCount !== 1 ? 's' : '') + ' detected</span>';

  var list = document.getElementById('extractedQuestions');
  list.innerHTML = data.questions.map(function(q, i) {
    var typeClass = q.type || 'Theory';
    var optionsHtml = '';
    var answerHtml = '';

    if (q.type === 'MCQ' && q.options) {
      var labels = ['A', 'B', 'C', 'D'];
      optionsHtml = '<div class="extract-options">';
      labels.forEach(function(l) {
        var val = q.options[l] || '';
        optionsHtml += '<div class="extract-option">' +
          '<span class="extract-option-label">' + l + '.</span>' +
          '<input class="extract-option-input" id="eopt-' + i + '-' + l + '" value="' + sanitize(val) + '">' +
          '</div>';
      });
      optionsHtml += '</div>' +
        '<div style="margin-bottom:var(--space-2);font-size:var(--text-sm)">Correct answer: ' +
        '<select class="extract-correct-select" id="ecorrect-' + i + '">' +
        '<option value="">—</option>' +
        '<option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>' +
        '</select></div>';
    } else {
      answerHtml = '<textarea class="extract-answer-input" id="eanswer-' + i + '" placeholder="Enter answer / solution (optional)" rows="2">' + sanitize(q.answer || '') + '</textarea>';
    }

    return '<div class="extract-item">' +
      '<div class="extract-item-header">' +
      '<span class="extract-item-num">Question ' + (i + 1) + '</span>' +
      '<span class="extract-item-type ' + typeClass + '">' + typeClass + '</span>' +
      '</div>' +
      '<textarea class="extract-question-text" id="eqtext-' + i + '" style="width:100%;min-height:60px" rows="2">' + sanitize(q.question) + '</textarea>' +
      optionsHtml + answerHtml +
      '<div style="font-size:var(--text-xs);color:var(--color-text-faint);margin-top:var(--space-2)">' +
      '<label><input type="checkbox" checked id="einclude-' + i + '"> Include in save</label></div>' +
      '</div>';
  }).join('');

  document.getElementById('extractSaveActions').style.display = 'flex';
  container.scrollIntoView({ behavior: 'smooth' });
}

async function saveExtractedQuestions() {
  var toSave = [];
  var summary = document.getElementById('extractSummary');

  extractedQuestions.forEach(function(q, i) {
    var include = document.getElementById('einclude-' + i);
    if (include && !include.checked) return;

    var questionText = document.getElementById('eqtext-' + i)?.value.trim();
    if (!questionText) return;

    var answer = '';
    if (q.type === 'MCQ') {
      var options = {};
      ['A', 'B', 'C', 'D'].forEach(function(l) {
        var optEl = document.getElementById('eopt-' + i + '-' + l);
        if (optEl) options[l] = optEl.value.trim();
      });
      var correct = document.getElementById('ecorrect-' + i)?.value || '';
      answer = JSON.stringify({ correct: correct, options: options });
    } else {
      answer = document.getElementById('eanswer-' + i)?.value.trim() || '';
    }

    toSave.push({
      level: q._level,
      course: q._course,
      code: q._code || '',
      year: q._year || '',
      topic: '',
      type: q.type || 'Theory',
      question: questionText,
      answer: answer,
    });
  });

  if (!toSave.length) { showToast('error', 'No questions selected to save.'); return; }

  var saved = 0;
  for (var i = 0; i < toSave.length; i++) {
    var res = await dbAddQuestion(toSave[i]);
    if (res.success) saved++;
  }

  showToast('success', saved + ' of ' + toSave.length + ' questions saved!');
  if (saved > 0) {
    await refreshQuestions();
    updateBadges();
  }
  resetExtract();
}

function resetExtract() {
  extractedQuestions = [];
  document.getElementById('extractResults').style.display = 'none';
  document.getElementById('extractSaveActions').style.display = 'none';
  document.getElementById('extractForm').reset();
  document.getElementById('extractDropZone').classList.remove('has-file');
  document.getElementById('extractFileInfo').textContent = '';
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
  var validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'];
  if (!validTypes.includes(file.type)) { showToast('error', 'Invalid file type. Allowed: PDF, PNG, JPG, DOC, DOCX, PPT, PPTX, TXT.'); e.target.value = ''; return; }
  if (dropZone) dropZone.classList.add('has-file');
  if (info) info.textContent = file.name + ' (' + formatFileSize(file.size) + ')';
}

async function handleUploadMaterial(e) {
  e.preventDefault();
  if (!currentUser) { closeAuthModal(); return; }

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

/* ─── Practice Test & CBT Engine ─────────────────── */
function formatTime(secs) {
  var m = Math.floor(secs / 60);
  var s = secs % 60;
  return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

function setQuizMode(mode) {
  quizMode = mode;
  var input = document.getElementById('quizModeInput');
  if (input) input.value = mode;

  var cardExam = document.getElementById('modeCardExam');
  var cardPractice = document.getElementById('modeCardPractice');
  if (cardExam) cardExam.classList.toggle('active', mode === 'exam');
  if (cardPractice) cardPractice.classList.toggle('active', mode === 'practice');

  var durGroup = document.getElementById('quizDurationGroup');
  if (durGroup) {
    durGroup.style.opacity = mode === 'exam' ? '1' : '0.4';
    durGroup.style.pointerEvents = mode === 'exam' ? 'auto' : 'none';
  }
}

function initPracticeView() {
  if (quizTimerId) { clearInterval(quizTimerId); quizTimerId = null; }
  quizActive = false;
  var setup = document.getElementById('quizSetup');
  var engine = document.getElementById('quizEngine');
  var results = document.getElementById('quizResults');
  if (setup) setup.style.display = 'block';
  if (engine) engine.style.display = 'none';
  if (results) results.style.display = 'none';
  populateQuizFilters();
  loadMatricNumber();
  renderQuizHistory();
}

function loadMatricNumber() {
  var saved = localStorage.getItem('nifes_matric') || '';
  var el = document.getElementById('quizMatric');
  if (el) el.value = saved;
}

function populateQuizFilters() {
  var lSel = document.getElementById('quizLevel');
  if (lSel) lSel.innerHTML = '<option value="">Select Level</option><option value="100">100 Level</option><option value="200">200 Level</option><option value="300">300 Level</option>';
  var cSel = document.getElementById('quizCourse');
  if (cSel) cSel.innerHTML = '<option value="">All Courses</option>';
}

function onQuizLevelChange() {
  var level = document.getElementById('quizLevel').value;
  var cSel = document.getElementById('quizCourse');
  if (!level) { cSel.innerHTML = '<option value="">All Courses</option>'; return; }
  var courses = [...new Set(questions.filter(function(q) { return q.level === level; }).map(function(q) { return q.course; }))];
  cSel.innerHTML = '<option value="">All Courses</option>' + courses.map(function(c) { return '<option value="' + sanitize(c) + '">' + sanitize(c) + '</option>'; }).join('');
}

function startQuiz() {
  if (!currentUser) {
    showAuthPage();
    showToast('warning', 'Please sign in or create an account to start your CBT practice test.');
    return;
  }
  var level = document.getElementById('quizLevel').value;
  var course = document.getElementById('quizCourse').value;
  var qCount = document.querySelector('input[name="quizCount"]:checked')?.value || '10';
  var qType = document.getElementById('quizType').value;
  var matric = document.getElementById('quizMatric').value.trim();
  quizMode = document.getElementById('quizModeInput')?.value || 'exam';
  quizDurationMins = parseInt(document.getElementById('quizDuration')?.value || '15', 10);

  if (!level) { showToast('error', 'Please select a level.'); return; }
  if (matric) localStorage.setItem('nifes_matric', matric);

  var pool = questions.filter(function(q) { return q.level === level; });
  if (course) pool = pool.filter(function(q) { return q.course === course; });
  if (qType) pool = pool.filter(function(q) { return q.type === qType; });

  if (!pool.length) { showToast('error', 'No questions available for selected filters.'); return; }

  pool = shuffleArray(pool);
  var count = qCount === 'all' ? pool.length : Math.min(parseInt(qCount), pool.length);
  quizQuestions = pool.slice(0, count);
  quizTotal = quizQuestions.length;
  quizIndex = 0;
  quizScore = 0;
  quizMissed = [];
  quizSelectedOption = '';
  quizUserAnswers = new Array(quizTotal).fill(null);
  quizFlagged = new Array(quizTotal).fill(false);
  quizActive = true;
  quizStartTime = Date.now();

  document.getElementById('quizSetup').style.display = 'none';
  document.getElementById('quizEngine').style.display = 'block';
  document.getElementById('quizResults').style.display = 'none';

  // Countdown timer for Timed CBT
  var timerPill = document.getElementById('cbtTimerPill');
  if (quizMode === 'exam' && quizDurationMins > 0) {
    quizTimeLeft = quizDurationMins * 60;
    if (timerPill) timerPill.style.display = 'inline-flex';
    updateTimerDisplay();
    if (quizTimerId) clearInterval(quizTimerId);
    quizTimerId = setInterval(function() {
      if (quizTimeLeft > 0) {
        quizTimeLeft--;
        updateTimerDisplay();
      } else {
        clearInterval(quizTimerId);
        quizTimerId = null;
        showToast('error', 'Time is up! Automatically submitting your test...');
        submitCbtExam(true);
      }
    }, 1000);
  } else {
    if (timerPill) timerPill.style.display = 'none';
  }

  showQuizQuestion();
  renderCbtPalette();
}

function updateTimerDisplay() {
  var display = document.getElementById('cbtTimerDisplay');
  var pill = document.getElementById('cbtTimerPill');
  if (!display || !pill) return;
  display.textContent = formatTime(quizTimeLeft);

  pill.classList.remove('cbt-timer-warning', 'cbt-timer-danger');
  if (quizTimeLeft <= 30) {
    pill.classList.add('cbt-timer-danger');
  } else if (quizTimeLeft <= 120) {
    pill.classList.add('cbt-timer-warning');
  }
}

function showQuizQuestion() {
  if (quizIndex >= quizTotal) {
    if (quizMode === 'exam') {
      openCbtSubmitModal();
      return;
    } else {
      showQuizResults(false);
      return;
    }
  }

  var q = quizQuestions[quizIndex];

  document.getElementById('quizProgress').textContent = 'Question ' + (quizIndex + 1) + ' of ' + quizTotal;
  document.getElementById('quizProgressFill').style.width = (((quizIndex + 1) / quizTotal) * 100) + '%';
  document.getElementById('quizQuestionNum').textContent = 'Question ' + (quizIndex + 1);
  document.getElementById('quizLevelBadge').textContent = q.level + 'L · ' + sanitize(q.course);
  document.getElementById('quizQuestionText').innerHTML = sanitize(q.question);

  var typeBadge = document.getElementById('quizTypeBadge');
  if (typeBadge) typeBadge.textContent = q.type || 'Question';

  var isFlagged = !!quizFlagged[quizIndex];
  var flagBtn = document.getElementById('quizFlagBtn');
  var flagText = document.getElementById('quizFlagText');
  var cardFlagBadge = document.getElementById('quizCardFlagged');
  if (flagBtn) flagBtn.classList.toggle('active', isFlagged);
  if (flagText) flagText.textContent = isFlagged ? 'Flagged ⚑' : 'Flag';
  if (cardFlagBadge) cardFlagBadge.style.display = isFlagged ? 'inline-flex' : 'none';

  var prevBtn = document.getElementById('quizPrevBtn');
  var nextBtn = document.getElementById('quizNextBtn');
  if (prevBtn) prevBtn.disabled = (quizIndex === 0);
  if (nextBtn) {
    if (quizIndex === quizTotal - 1) {
      nextBtn.innerHTML = 'Review & Submit <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
    } else {
      nextBtn.innerHTML = 'Next <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>';
    }
  }

  var ansSection = document.getElementById('quizAnswerSection');
  var showBtn = document.getElementById('quizShowBtn');
  var paletteCard = document.getElementById('cbtPaletteCard');

  if (quizMode === 'exam') {
    if (ansSection) ansSection.classList.remove('show');
    if (showBtn) showBtn.style.display = 'none';
    if (paletteCard) paletteCard.style.display = 'block';
  } else {
    if (ansSection) ansSection.classList.remove('show');
    if (showBtn) showBtn.style.display = '';
    document.getElementById('quizGotIt').style.display = 'none';
    document.getElementById('quizMissedIt').style.display = 'none';
    if (paletteCard) paletteCard.style.display = 'block';
  }

  // Render options
  var optsEl = document.getElementById('quizOptions');
  var parsed = extractMCQ(q);
  var currentSelected = quizUserAnswers[quizIndex] || '';

  if (parsed) {
    optsEl.style.display = 'flex';
    var labels = ['A', 'B', 'C', 'D'];
    optsEl.innerHTML = labels.map(function(l) {
      var isSelected = (currentSelected === l);
      return '<div class="quiz-option' + (isSelected ? ' selected' : '') + '" data-opt="' + l + '" onclick="selectQuizOption(this,\'' + l + '\')">' +
        '<input type="radio" name="qopt" id="qopt-' + l + '" style="display:none"' + (isSelected ? ' checked' : '') + '>' +
        '<span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:var(--radius-sm);background:var(--color-surface-dynamic);font-weight:600;font-size:var(--text-xs);flex-shrink:0">' + l + '</span>' +
        '<span>' + sanitize(parsed.options[l] || '') + '</span></div>';
    }).join('');
  } else {
    optsEl.style.display = 'none';
  }

  var ansText = q.answer ? (parsed ? (parsed.correct ? 'Correct Answer: <strong>' + parsed.correct + '</strong>' : 'Solution not provided yet.') : sanitize(q.answer).replace(/\n/g, '<br>')) : 'Solution not provided yet.';
  document.getElementById('quizAnswerBox').innerHTML = ansText;

  renderCbtPalette();
}

function selectQuizOption(el, label) {
  var parent = document.getElementById('quizOptions');
  var all = parent.querySelectorAll('.quiz-option');
  all.forEach(function(o) { o.classList.remove('selected'); });
  el.classList.add('selected');
  
  quizUserAnswers[quizIndex] = label;
  quizSelectedOption = label;
  renderCbtPalette();
}

function toggleQuizFlag() {
  quizFlagged[quizIndex] = !quizFlagged[quizIndex];
  var isFlagged = quizFlagged[quizIndex];
  var flagBtn = document.getElementById('quizFlagBtn');
  var flagText = document.getElementById('quizFlagText');
  var cardFlagBadge = document.getElementById('quizCardFlagged');
  if (flagBtn) flagBtn.classList.toggle('active', isFlagged);
  if (flagText) flagText.textContent = isFlagged ? 'Flagged ⚑' : 'Flag';
  if (cardFlagBadge) cardFlagBadge.style.display = isFlagged ? 'inline-flex' : 'none';
  renderCbtPalette();
}

function quizPrev() {
  if (quizIndex > 0) {
    quizIndex--;
    showQuizQuestion();
  }
}

function quizNext() {
  if (quizIndex < quizTotal - 1) {
    quizIndex++;
    showQuizQuestion();
  } else {
    if (quizMode === 'exam') {
      openCbtSubmitModal();
    } else {
      showQuizResults(false);
    }
  }
}

function jumpToQuizQuestion(idx) {
  if (idx >= 0 && idx < quizTotal) {
    quizIndex = idx;
    showQuizQuestion();
  }
}

function renderCbtPalette() {
  var grid = document.getElementById('cbtPaletteGrid');
  if (!grid) return;
  grid.innerHTML = quizQuestions.map(function(q, i) {
    var isCurrent = (i === quizIndex);
    var isAnswered = (quizUserAnswers[i] !== null && quizUserAnswers[i] !== undefined);
    var isFlagged = !!quizFlagged[i];
    
    var cls = 'cbt-palette-btn';
    if (isCurrent) cls += ' current';
    if (isAnswered) cls += ' answered';
    if (isFlagged) cls += ' flagged';

    return '<button type="button" class="' + cls + '" onclick="jumpToQuizQuestion(' + i + ')" title="Question ' + (i + 1) + '">' +
      (i + 1) + '</button>';
  }).join('');
}

function openCbtSubmitModal() {
  var answeredCount = quizUserAnswers.filter(function(a) { return a !== null; }).length;
  var unansweredCount = quizTotal - answeredCount;
  var flaggedCount = quizFlagged.filter(Boolean).length;

  document.getElementById('modalTotalQ').textContent = quizTotal;
  document.getElementById('modalAnsweredQ').textContent = answeredCount;
  document.getElementById('modalUnansweredQ').textContent = unansweredCount;
  document.getElementById('modalFlaggedQ').textContent = flaggedCount;

  document.getElementById('cbtSubmitModal').classList.remove('hidden');
}

function closeCbtSubmitModal() {
  document.getElementById('cbtSubmitModal').classList.add('hidden');
}

function confirmCbtSubmit() {
  closeCbtSubmitModal();
  submitCbtExam(false);
}

function submitCbtExam(autoSubmitted) {
  if (quizTimerId) {
    clearInterval(quizTimerId);
    quizTimerId = null;
  }
  quizEndTime = Date.now();
  quizActive = false;

  quizScore = 0;
  quizMissed = [];

  quizQuestions.forEach(function(q, i) {
    var parsed = extractMCQ(q);
    var userAns = quizUserAnswers[i];
    var isCorrect = false;

    if (parsed && parsed.correct) {
      if (userAns === parsed.correct) {
        isCorrect = true;
      }
    }

    if (isCorrect) {
      quizScore++;
    } else {
      quizMissed.push({
        question: q,
        index: i,
        userAnswer: userAns,
        correctAnswer: parsed?.correct || q.answer || '',
        flagged: !!quizFlagged[i]
      });
    }
  });

  showQuizResults(autoSubmitted);
}

function showQuizAnswer() {
  var ansSection = document.getElementById('quizAnswerSection');
  ansSection.classList.add('show');
  document.getElementById('quizShowBtn').style.display = 'none';
  document.getElementById('quizGotIt').style.display = '';
  document.getElementById('quizMissedIt').style.display = '';

  var parsed = extractMCQ(quizQuestions[quizIndex]);
  if (parsed) {
    var optsEl = document.getElementById('quizOptions');
    var all = optsEl.querySelectorAll('.quiz-option');
    all.forEach(function(o) {
      var l = o.getAttribute('data-opt');
      if (parsed.correct && l === parsed.correct) { o.classList.remove('selected', 'wrong'); o.classList.add('correct'); }
      else if (l === quizSelectedOption) { o.classList.remove('selected', 'correct'); o.classList.add('wrong'); }
    });
  }
}

function quizGotIt() {
  quizScore++;
  quizIndex++;
  showQuizQuestion();
}

function quizMissedIt() {
  quizMissed.push({
    question: quizQuestions[quizIndex],
    index: quizIndex,
    userAnswer: quizSelectedOption || 'None',
    correctAnswer: quizQuestions[quizIndex].answer || '',
    flagged: !!quizFlagged[quizIndex]
  });
  quizIndex++;
  showQuizQuestion();
}

function showQuizResults(autoSubmitted) {
  quizActive = false;
  if (quizTimerId) { clearInterval(quizTimerId); quizTimerId = null; }
  document.getElementById('quizEngine').style.display = 'none';
  document.getElementById('quizResults').style.display = 'block';

  var pct = Math.round((quizScore / quizTotal) * 100);
  var wrong = quizTotal - quizScore;
  var durationSecs = Math.max(1, Math.round(((quizEndTime || Date.now()) - (quizStartTime || Date.now())) / 1000));
  var paceSecs = Math.round(durationSecs / (quizTotal || 1));

  document.getElementById('resultScore').textContent = quizScore + ' / ' + quizTotal;
  document.getElementById('resCorrectCount').textContent = quizScore;
  document.getElementById('resWrongCount').textContent = wrong;
  document.getElementById('resTimeSpent').textContent = formatTime(durationSecs);
  document.getElementById('resPace').textContent = paceSecs + 's / Q';

  var iconEl = document.getElementById('resultIcon');
  var labelEl = document.getElementById('resultLabel');
  if (pct === 100) { iconEl.textContent = '🏆'; labelEl.textContent = 'Flawless Victory! Perfect CBT Score!'; }
  else if (pct >= 80) { iconEl.textContent = '🎉'; labelEl.textContent = 'Outstanding! Distinction standard.'; }
  else if (pct >= 70) { iconEl.textContent = '👏'; labelEl.textContent = 'Great performance! Solid understanding.'; }
  else if (pct >= 50) { iconEl.textContent = '👍'; labelEl.textContent = 'Good effort! Review the missed questions below.'; }
  else if (pct >= 30) { iconEl.textContent = '💪'; labelEl.textContent = 'Keep practicing! Steady repetition brings mastery.'; }
  else { iconEl.textContent = '📚'; labelEl.textContent = 'Time to review the lecture notes and try again!'; }

  var pctEl = document.getElementById('resultPct');
  pctEl.textContent = pct + '%';
  pctEl.className = 'quiz-result-pct ' + (pct >= 70 ? 'good' : pct >= 50 ? 'ok' : 'bad');

  var fillEl = document.getElementById('resultFill');
  fillEl.style.width = pct + '%';
  var fillClass = pct >= 70 ? 'good' : pct >= 50 ? 'ok' : 'bad';
  fillEl.className = 'quiz-result-fill ' + fillClass;

  // Update Review Filter Counters
  var flaggedCount = quizFlagged.filter(Boolean).length;
  document.getElementById('countReviewAll').textContent = quizTotal;
  document.getElementById('countReviewCorrect').textContent = quizScore;
  document.getElementById('countReviewMissed').textContent = quizMissed.length;
  document.getElementById('countReviewFlagged').textContent = flaggedCount;

  currentReviewFilter = 'all';
  renderCbtReviewList();

  document.getElementById('resultRetryBtn').style.display = quizMissed.length ? '' : 'none';

  // Save Mock CBT Session to DB
  dbSaveQuizSession({
    matric_number: localStorage.getItem('nifes_matric') || '',
    level: quizQuestions[0]?.level || '',
    course: quizQuestions[0]?.course || '',
    question_type: quizMode === 'exam' ? 'Timed CBT' : 'Practice',
    score: quizScore,
    total: quizTotal,
    missed_data: quizMissed.map(function(m) { return m.question || m; })
  });
}

function filterCbtReview(filterType, btn) {
  currentReviewFilter = filterType;
  var allBtns = document.querySelectorAll('.cbt-review-filter-tabs .tab-btn');
  allBtns.forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  renderCbtReviewList();
}

function renderCbtReviewList() {
  var container = document.getElementById('resultMissed');
  if (!container) return;

  var itemsToRender = [];

  quizQuestions.forEach(function(q, idx) {
    var parsed = extractMCQ(q);
    var userChoice = quizUserAnswers[idx];
    var isCorrect = (parsed && parsed.correct && userChoice === parsed.correct);
    var isFlagged = !!quizFlagged[idx];

    var match = false;
    if (currentReviewFilter === 'all') match = true;
    else if (currentReviewFilter === 'correct' && isCorrect) match = true;
    else if (currentReviewFilter === 'missed' && !isCorrect) match = true;
    else if (currentReviewFilter === 'flagged' && isFlagged) match = true;

    if (match) {
      itemsToRender.push({
        question: q,
        index: idx,
        userChoice: userChoice,
        parsed: parsed,
        isCorrect: isCorrect,
        isFlagged: isFlagged
      });
    }
  });

  if (!itemsToRender.length) {
    container.innerHTML = '<p style="color:var(--color-text-muted);text-align:center;padding:var(--space-6)">No questions match this filter.</p>';
    return;
  }

  container.innerHTML = itemsToRender.map(function(item) {
    var q = item.question;
    var statusClass = item.isCorrect ? 'correct' : (item.userChoice ? 'wrong' : 'skipped');
    var statusLabel = item.isCorrect ? '✓ Correct' : (item.userChoice ? '✕ Incorrect' : '○ Skipped');
    var flagBadge = item.isFlagged ? '<span class="flag-badge">⚑ Flagged</span>' : '';
    
    var renderedOptions = renderMCQOptions(q) || sanitize(q.answer).replace(/\n/g, '<br>');
    var userChoiceDisplay = item.userChoice ? '<strong>Option ' + item.userChoice + '</strong>' : '<span style="color:var(--color-text-muted)">No answer selected</span>';

    return '<div class="review-item-card">' +
      '<div class="review-item-header">' +
        '<span style="font-weight:700;font-size:var(--text-sm)">Question ' + (item.index + 1) + ' · ' + q.level + 'L ' + sanitize(q.course) + '</span>' +
        '<div style="display:flex;align-items:center;gap:var(--space-2)">' +
          flagBadge +
          '<span class="review-status-tag ' + statusClass + '">' + statusLabel + '</span>' +
        '</div>' +
      '</div>' +
      '<p style="margin-bottom:var(--space-3);color:var(--color-text);font-size:var(--text-sm);line-height:1.6">' + sanitize(q.question) + '</p>' +
      '<div style="font-size:var(--text-xs);margin-bottom:var(--space-2);color:var(--color-text-muted)">Your Answer: ' + userChoiceDisplay + '</div>' +
      '<div style="background:var(--color-surface-offset);border-left:3px solid var(--color-primary);padding:var(--space-2) var(--space-3);border-radius:var(--radius-sm);font-size:var(--text-xs);line-height:1.6">' +
        renderedOptions +
      '</div>' +
    '</div>';
  }).join('');
}

function retryMissed() {
  if (!quizMissed.length) return;
  quizQuestions = shuffleArray(quizMissed.map(function(m) { return m.question || m; }));
  quizTotal = quizQuestions.length;
  quizIndex = 0;
  quizScore = 0;
  quizMissed = [];
  quizSelectedOption = '';
  quizUserAnswers = new Array(quizTotal).fill(null);
  quizFlagged = new Array(quizTotal).fill(false);
  quizActive = true;
  quizStartTime = Date.now();

  document.getElementById('quizResults').style.display = 'none';
  document.getElementById('quizEngine').style.display = 'block';

  var timerPill = document.getElementById('cbtTimerPill');
  if (quizMode === 'exam' && quizDurationMins > 0) {
    quizTimeLeft = Math.ceil(quizDurationMins * (quizTotal / 10)) * 60;
    if (timerPill) timerPill.style.display = 'inline-flex';
    updateTimerDisplay();
    if (quizTimerId) clearInterval(quizTimerId);
    quizTimerId = setInterval(function() {
      if (quizTimeLeft > 0) {
        quizTimeLeft--;
        updateTimerDisplay();
      } else {
        clearInterval(quizTimerId);
        quizTimerId = null;
        showToast('error', 'Time is up! Submitting your retry exam...');
        submitCbtExam(true);
      }
    }, 1000);
  }

  showQuizQuestion();
  renderCbtPalette();
}

function newTest() {
  initPracticeView();
}

function installPWA() {
  if (!deferredPWAInstallPrompt) return;
  deferredPWAInstallPrompt.prompt();
  deferredPWAInstallPrompt.userChoice.then(function(res) {
    if (res.outcome === 'accepted') {
      showToast('success', 'NIFES Study Hub has been installed to your device!');
    }
    deferredPWAInstallPrompt = null;
    var btn = document.getElementById('pwaInstallBtn');
    if (btn) btn.style.display = 'none';
  });
}

function shuffleArray(arr) {
  var a = [].concat(arr);
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

/* ─── Materials View ──────────────────────────────── */
function renderMaterialsView() {
  var levelFilter = document.getElementById('matFilterLevel')?.value || '';
  var courseFilter = document.getElementById('matFilterCourse')?.value || '';

  // Populate course dropdown from materials
  var courseSel = document.getElementById('matFilterCourse');
  if (courseSel) {
    var courses = [...new Set(materials.map(function(m) { return m.course; }))].sort();
    var prev = courseSel.value;
    courseSel.innerHTML = '<option value="">All Courses</option>' + courses.map(function(c) {
      return '<option value="' + sanitize(c) + '"' + (c === prev ? ' selected' : '') + '>' + sanitize(c) + '</option>';
    }).join('');
    if (prev) courseSel.value = prev;
  }

  var filtered = materials.filter(function(m) {
    if (levelFilter && m.level !== levelFilter) return false;
    if (courseFilter && m.course !== courseFilter) return false;
    return true;
  });

  var pqMats = filtered.filter(function(m) { return m.type === 'Past Question PDF'; });
  var otherMats = filtered.filter(function(m) { return m.type !== 'Past Question PDF'; });

  document.getElementById('pqMatsGrid').innerHTML = pqMats.map(renderMaterialCard).join('') ||
    '<div class="empty-state" style="grid-column:1/-1"><h3>No past question PDFs yet</h3><p>Upload PQs from the Contribute page.</p></div>';
  document.getElementById('otherMatsGrid').innerHTML = otherMats.map(renderMaterialCard).join('') ||
    '<div class="empty-state" style="grid-column:1/-1"><h3>No other materials yet</h3><p>Upload lecture notes and textbooks from the Contribute page.</p></div>';

  document.getElementById('pqMatsCount').textContent = pqMats.length + ' file' + (pqMats.length !== 1 ? 's' : '');
  document.getElementById('otherMatsCount').textContent = otherMats.length + ' file' + (otherMats.length !== 1 ? 's' : '');
  var countText = filtered.length + ' file' + (filtered.length !== 1 ? 's' : '');
  if (levelFilter) countText += ' (' + levelFilter + 'L)';
  document.getElementById('materialsSubtitle').textContent = countText;
}

function switchMaterialsTab(tab) {
  document.querySelectorAll('#view-materials .tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelectorAll('#view-materials .tab-content').forEach(function(c) { c.classList.remove('active'); });
  var tabBtn = document.querySelector('#view-materials .tab[data-tab="' + tab + '"]');
  if (tabBtn) tabBtn.classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
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
  document.getElementById('searchTitle').textContent = '"' + sanitize(val) + '" — ' + results.length + ' result' + (results.length !== 1 ? 's' : '');
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
  var matsEl = document.getElementById('badge-materials');
  if (matsEl) matsEl.textContent = materials.length;
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
  var theme = saved || 'light';
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
