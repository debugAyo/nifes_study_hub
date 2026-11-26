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
    if (filters.status) query = query.eq('status', filters.status);
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
    var payload = Object.assign({}, questionData, { 
      user_id: user?.data?.user?.id || null,
      status: 'pending' // Defaults to pending, auto-approved via trigger if admin
    });
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
    if (filters.status) query = query.eq('status', filters.status);
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

    // 10MB limit enforcement
    var MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { success: false, error: 'File size exceeds maximum permitted limit (10MB).' };
    }

    var timestamp = Date.now();
    var safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    var filePath = user.id + '/' + timestamp + '_' + safeName;

    var uploadResult = await supabaseClient.storage
      .from('study-materials').upload(filePath, file, { cacheControl: '3600' });
    if (uploadResult.error) throw uploadResult.error;

    var urlResult = supabaseClient.storage
      .from('study-materials').getPublicUrl(filePath);

    var dbResult = await supabaseClient.from('materials').insert({
      level: metadata.level,
      course: metadata.course,
      code: metadata.code || '',
      title: metadata.title,
      type: metadata.type,
      file_url: urlResult.data.publicUrl,
      file_name: file.name,
      file_size: file.size,
      content_type: file.type,
      user_id: user.id,
      status: 'pending' // auto-approved via trigger if admin/superuser
    }).select().single();

    if (dbResult.error) throw dbResult.error;
    return { success: true, data: dbResult.data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/* ─── Moderation Actions ─────────────────────────── */
async function dbApproveItem(table, id) {
  try {
    if (!supabaseClient) return { success: false, error: 'Supabase not configured' };
    var user = await supabaseClient.auth.getUser();
    var result = await supabaseClient.from(table).update({
      status: 'approved',
      reviewed_by: user?.data?.user?.id || null,
      reviewed_at: new Date().toISOString()
    }).eq('id', id);
    if (result.error) throw result.error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function dbRejectItem(table, id) {
  try {
    if (!supabaseClient) return { success: false, error: 'Supabase not configured' };
    var user = await supabaseClient.auth.getUser();
    var result = await supabaseClient.from(table).update({
      status: 'rejected',
      reviewed_by: user?.data?.user?.id || null,
      reviewed_at: new Date().toISOString()
    }).eq('id', id);
    if (result.error) throw result.error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function dbFetchPendingItems(table) {
  try {
    if (!supabaseClient) return { success: false, data: [] };
    var result = await supabaseClient.from(table)
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (result.error) throw result.error;
    return { success: true, data: result.data || [] };
  } catch (err) {
    return { success: false, error: err.message, data: [] };
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
    if (!supabaseClient) return { success: false, error: 'Supabase authentication is not configured.' };
    
    var origin = window.location.origin || 'https://nifes-studyhub.vercel.app';
    var redirectTo = (origin.startsWith('file:') || origin === 'null') ? 'http://localhost:3000/app' : origin + '/app';
    
    var res = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account'
        }
      }
    });
    if (res.error) throw res.error;
    return { success: true, data: res.data };
  } catch (err) {
    console.error('Google sign in error:', err);
    return { success: false, error: err.message || 'Failed to initialize Google Sign-In.' };
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

async function dbGetAuthToken() {
  try {
    if (!supabaseClient) return null;
    var { data } = await supabaseClient.auth.getSession();
    return data?.session?.access_token || null;
  } catch { return null; }
}

async function dbResetPassword(email) {
  try {
    if (!supabaseClient) return { success: false, error: 'Supabase not configured' };
    var origin = window.location.origin || 'https://nifes-studyhub.vercel.app';
    var redirectTo = (origin.startsWith('file:') || origin === 'null') ? 'http://localhost:3000/app' : origin + '/app';
    var result = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo,
    });
    if (result.error) throw result.error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function dbGetProfile(userId) {
  try {
    if (!supabaseClient) return { success: false, error: 'Supabase not configured', data: null };
    var result = await supabaseClient.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) {
      var user = await supabaseClient.auth.getUser();
      var meta = user?.data?.user?.user_metadata;
      var fullName = meta?.full_name || meta?.name || user?.data?.user?.email?.split('@')[0] || 'Scholar';
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

async function dbUpdateProfile(userId, profileData) {
  try {
    if (!supabaseClient) return { success: false, error: 'Supabase not configured' };
    var updates = {};
    if (profileData.full_name !== undefined) updates.full_name = profileData.full_name;
    if (profileData.department !== undefined) updates.department = profileData.department;
    if (profileData.level !== undefined) updates.level = profileData.level;
    if (profileData.avatar_url !== undefined) updates.avatar_url = profileData.avatar_url;

    var result = await supabaseClient.from('profiles').update(updates).eq('id', userId);
    
    // Sync to auth user_metadata if full_name or avatar is updated
    if (profileData.full_name || profileData.avatar_url) {
      var metaUpdates = {};
      if (profileData.full_name) metaUpdates.full_name = profileData.full_name;
      if (profileData.avatar_url) metaUpdates.avatar_url = profileData.avatar_url;
      await supabaseClient.auth.updateUser({ data: metaUpdates }).catch(function(e) {
        console.warn('Could not sync user_metadata:', e);
      });
    }

    if (result.error) {
      // Graceful fallback if custom columns (avatar_url/department/level) are pending SQL migration
      if (result.error.message && result.error.message.includes('column')) {
        var fallback = await supabaseClient.from('profiles').update({ full_name: profileData.full_name }).eq('id', userId);
        if (fallback.error) throw fallback.error;
      } else {
        throw result.error;
      }
    }
    return { success: true };
  } catch (err) {
    console.error('dbUpdateProfile error:', err);
    return { success: false, error: err.message };
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
