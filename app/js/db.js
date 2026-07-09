/* ══════════════════════════════════════════════════
   NIFES Study Hub — Supabase Data Layer
   ══════════════════════════════════════════════════ */

var supabaseClient = null;

function initSupabase(url, anonKey) {
  if (supabaseClient) return supabaseClient;
  if (!window.supabase) return null;
  supabaseClient = window.supabase.createClient(url, anonKey);
  return supabaseClient;
}

async function dbFetchQuestions(filters) {
  filters = filters || {};
  try {
    if (!supabaseClient) return { success: false, error: 'Supabase not configured', data: [] };
    var query = supabaseClient.from('questions').select('*');
    if (filters.level) query = query.eq('level', filters.level);
    if (filters.course) query = query.eq('course', filters.course);
    if (filters.year) query = query.eq('year', filters.year);
    if (filters.type) query = query.eq('type', filters.type);
    var result = await query.order('created_at', { ascending: false });
    if (result.error) throw result.error;
    return { success: true, data: result.data };
  } catch (err) {
    console.error('[db] fetchQuestions:', err);
    return { success: false, error: err.message, data: [] };
  }
}

async function dbAddQuestion(questionData) {
  try {
    if (!supabaseClient) return { success: false, error: 'Supabase not configured' };
    var user = await supabaseClient.auth.getUser();
    var payload = Object.assign({}, questionData, { user_id: user?.data?.user?.id || null });
    var result = await supabaseClient.from('questions').insert(payload).select().single();
    if (result.error) throw result.error;
    return { success: true, data: result.data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function dbFetchMaterials(filters) {
  filters = filters || {};
  try {
    if (!supabaseClient) return { success: false, data: [] };
    var query = supabaseClient.from('materials').select('*');
    if (filters.level) query = query.eq('level', filters.level);
    if (filters.course) query = query.eq('course', filters.course);
    var result = await query.order('created_at', { ascending: false });
    if (result.error) throw result.error;
    return { success: true, data: result.data };
  } catch (err) {
    return { success: false, error: err.message, data: [] };
  }
}

async function dbUploadMaterial(file, metadata) {
  try {
    if (!supabaseClient) return { success: false, error: 'Supabase not configured' };
    var userResult = await supabaseClient.auth.getUser();
    var user = userResult.data?.user;
    if (!user) return { success: false, error: 'You must be logged in to upload.' };

    var timestamp = Date.now();
    var safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    var filePath = user.id + '/' + timestamp + '_' + safeName;

    var uploadResult = await supabaseClient.storage
      .from('study-materials').upload(filePath, file, { cacheControl: '3600' });
    if (uploadResult.error) throw uploadResult.error;

    var urlResult = supabaseClient.storage
      .from('study-materials').getPublicUrl(filePath);

    var dbResult = await supabaseClient.from('materials').insert({
      level: metadata.level, course: metadata.course, code: metadata.code || '',
      title: metadata.title, type: metadata.type, file_url: urlResult.data.publicUrl,
      file_name: file.name, file_size: file.size, content_type: file.type, user_id: user.id,
    }).select().single();

    if (dbResult.error) throw dbResult.error;
    return { success: true, data: dbResult.data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function dbSaveQuizSession(sessionData) {
  try {
    if (!supabaseClient) return { success: false, error: 'Supabase not configured' };
    var userResult = await supabaseClient.auth.getUser();
    var payload = Object.assign({}, sessionData, { user_id: userResult?.data?.user?.id || null });
    var result = await supabaseClient.from('quiz_sessions').insert(payload).select().single();
    if (result.error) throw result.error;
    return { success: true, data: result.data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function dbSignUp(email, password, fullName) {
  try {
    if (!supabaseClient) return { success: false, error: 'Supabase not configured' };
    var result = await supabaseClient.auth.signUp({
      email: email, password: password, options: { data: { full_name: fullName } }
    });
    if (result.error) throw result.error;
    return { success: true, data: result.data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function dbSignIn(email, password) {
  try {
    if (!supabaseClient) return { success: false, error: 'Supabase not configured' };
    var result = await supabaseClient.auth.signInWithPassword({ email: email, password: password });
    if (result.error) throw result.error;
    return { success: true, data: result.data };
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
  supabaseClient.auth.onAuthStateChange(function(event, session) {
    callback(event, session);
  });
}

async function dbGetCurrentUser() {
  try {
    if (!supabaseClient) return null;
    var result = await supabaseClient.auth.getUser();
    return result.data?.user || null;
  } catch { return null; }
}

/* ─── Auth Token ──────────────────────────────────── */
async function dbGetAuthToken() {
  try {
    if (!supabaseClient) return null;
    var { data } = await supabaseClient.auth.getSession();
    return data?.session?.access_token || null;
  } catch { return null; }
}

/* ─── Password Reset ──────────────────────────────── */
async function dbResetPassword(email) {
  try {
    if (!supabaseClient) return { success: false, error: 'Supabase not configured' };
    var result = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/app/index.html',
    });
    if (result.error) throw result.error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/* ─── Profiles / Roles ────────────────────────────── */
async function dbGetProfile(userId) {
  try {
    if (!supabaseClient) return { success: false, error: 'Supabase not configured', data: null };
    var result = await supabaseClient.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) {
      // Auto-create profile if missing (e.g. user signed up before migration)
      var user = await supabaseClient.auth.getUser();
      var fullName = user?.data?.user?.user_metadata?.full_name || '';
      var insertRes = await supabaseClient.from('profiles').insert({
        id: userId, full_name: fullName, role: 'user'
      }).select().maybeSingle();
      if (insertRes.error) throw insertRes.error;
      return { success: true, data: insertRes.data };
    }
    return { success: true, data: result.data };
  } catch (err) {
    return { success: false, error: err.message, data: null };
  }
}

async function dbFetchAllUsers() {
  try {
    if (!supabaseClient) return { success: false, error: 'Supabase not configured', data: [] };
    var result = await supabaseClient.from('profiles').select('id, full_name, role, created_at');
    if (result.error) throw result.error;
    var profiles = result.data || [];
    var users = [];
    for (var i = 0; i < profiles.length; i++) {
      var p = profiles[i];
      var qRes = await supabaseClient.from('questions').select('id', { count: 'exact', head: true }).eq('user_id', p.id);
      var qCount = qRes.count || 0;
      users.push({ id: p.id, full_name: p.full_name, role: p.role, created_at: p.created_at, question_count: qCount });
    }
    return { success: true, data: users };
  } catch (err) {
    return { success: false, error: err.message, data: [] };
  }
}

async function dbUpdateUserRole(userId, role) {
  try {
    if (!supabaseClient) return { success: false, error: 'Supabase not configured' };
    var result = await supabaseClient.from('profiles').update({ role: role }).eq('id', userId);
    if (result.error) throw result.error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/* ─── Bookmarks ───────────────────────────────────── */
async function dbToggleBookmark(questionId) {
  try {
    if (!supabaseClient) return { success: false, error: 'Supabase not configured' };
    var user = await supabaseClient.auth.getUser();
    var userId = user?.data?.user?.id;
    if (!userId) return { success: false, error: 'Not authenticated' };

    var existing = await supabaseClient.from('bookmarks').select('id').eq('user_id', userId).eq('question_id', questionId).maybeSingle();
    if (existing.data) {
      await supabaseClient.from('bookmarks').delete().eq('id', existing.data.id);
      return { success: true, bookmarked: false };
    } else {
      await supabaseClient.from('bookmarks').insert({ user_id: userId, question_id: questionId });
      return { success: true, bookmarked: true };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function dbFetchBookmarks() {
  try {
    if (!supabaseClient) return { success: false, data: [] };
    var user = await supabaseClient.auth.getUser();
    var userId = user?.data?.user?.id;
    if (!userId) return { success: true, data: [] };
    var result = await supabaseClient.from('bookmarks').select('question_id').eq('user_id', userId);
    if (result.error) throw result.error;
    return { success: true, data: result.data || [] };
  } catch (err) {
    return { success: false, error: err.message, data: [] };
  }
}

/* ─── Quiz History ────────────────────────────────── */
async function dbFetchQuizSessions(limit) {
  limit = limit || 10;
  try {
    if (!supabaseClient) return { success: false, data: [] };
    var user = await supabaseClient.auth.getUser();
    var userId = user?.data?.user?.id;
    if (!userId) return { success: true, data: [] };
    var result = await supabaseClient.from('quiz_sessions')
      .select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
    if (result.error) throw result.error;
    return { success: true, data: result.data || [] };
  } catch (err) {
    return { success: false, error: err.message, data: [] };
  }
}

/* ─── Edit / Delete Questions ─────────────────────── */
async function dbUpdateQuestion(id, data) {
  try {
    if (!supabaseClient) return { success: false, error: 'Supabase not configured' };
    var user = await supabaseClient.auth.getUser();
    var payload = Object.assign({}, data, { updated_at: new Date().toISOString(), edited_by: user?.data?.user?.id || null });
    var result = await supabaseClient.from('questions').update(payload).eq('id', id).select().single();
    if (result.error) throw result.error;
    return { success: true, data: result.data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function dbDeleteQuestion(id) {
  try {
    if (!supabaseClient) return { success: false, error: 'Supabase not configured' };
    var result = await supabaseClient.from('questions').delete().eq('id', id);
    if (result.error) throw result.error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function dbDeleteMaterial(id) {
  try {
    if (!supabaseClient) return { success: false, error: 'Supabase not configured' };
    var result = await supabaseClient.from('materials').delete().eq('id', id);
    if (result.error) throw result.error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/* ─── Paginated Questions ─────────────────────────── */
async function dbFetchQuestionsPaginated(level, page, perPage) {
  page = page || 1;
  perPage = perPage || 20;
  try {
    if (!supabaseClient) return { success: false, error: 'Supabase not configured', data: [], count: 0 };
    var from = (page - 1) * perPage;
    var to = from + perPage - 1;
    var query = supabaseClient.from('questions').select('*', { count: 'exact' });
    if (level) query = query.eq('level', level);
    var result = await query.order('created_at', { ascending: false }).range(from, to);
    if (result.error) throw result.error;
    return { success: true, data: result.data, count: result.count };
  } catch (err) {
    return { success: false, error: err.message, data: [], count: 0 };
  }
}
