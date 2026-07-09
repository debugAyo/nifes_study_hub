const { createClient } = require('@supabase/supabase-js');

async function requireAuth(req, res, next) {
  var token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    var supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    var { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) throw new Error('Invalid token');
    req.user = data.user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { requireAuth };
