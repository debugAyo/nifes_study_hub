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
