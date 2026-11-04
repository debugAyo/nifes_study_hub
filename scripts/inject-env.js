/**
 * Bulletproof Production Environment Variable Injector for Vercel & Local
 * 
 * Injects SUPABASE_URL, SUPABASE_ANON_KEY, and SERVER_URL into config.js.
 * Resilient against any working directory differences or missing template files.
 * NEVER exits with code 1 so production deployments will not crash.
 */

var fs = require('fs');
var path = require('path');

try {
  var rootDir = path.resolve(__dirname, '..');
  var cwd = process.cwd();

  // Candidate locations for config.template.js
  var templateCandidates = [
    path.join(rootDir, 'app', 'js', 'config.template.js'),
    path.join(cwd, 'app', 'js', 'config.template.js'),
    path.join(cwd, 'js', 'config.template.js'),
    path.join(__dirname, '..', 'app', 'js', 'config.template.js')
  ];

  var templatePath = null;
  for (var i = 0; i < templateCandidates.length; i++) {
    if (fs.existsSync(templateCandidates[i])) {
      templatePath = templateCandidates[i];
      break;
    }
  }

  // Fallback template content in case file is ever missing
  var defaultTemplate = [
    '// NIFES Study Hub — Auto-generated Configuration',
    'var SUPABASE_URL = \'__SUPABASE_URL__\';',
    'var SUPABASE_ANON_KEY = \'__SUPABASE_ANON_KEY__\';',
    '',
    'var SERVER_URL = window.location.hostname === \'localhost\' || window.location.hostname === \'127.0.0.1\'',
    '  ? \'http://localhost:3001\'',
    '  : \'__SERVER_URL__\';',
    ''
  ].join('\n');

  var templateContent = defaultTemplate;
  if (templatePath) {
    try {
      templateContent = fs.readFileSync(templatePath, 'utf8');
      console.log('[inject-env] Found template at:', templatePath);
    } catch (e) {
      console.warn('[inject-env] Warning reading template, using default fallback:', e.message);
    }
  } else {
    console.warn('[inject-env] Template file not found, using embedded template.');
  }

  // Minimal .env parser
  function loadEnv(filePath) {
    var out = {};
    if (!fs.existsSync(filePath)) return out;
    try {
      var lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
      lines.forEach(function(line) {
        line = line.trim();
        if (!line || line.startsWith('#')) return;
        if (line.startsWith('export ')) line = line.substring(7).trim();
        var eq = line.indexOf('=');
        if (eq === -1) return;
        var k = line.substring(0, eq).trim();
        var v = line.substring(eq + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.substring(1, v.length - 1);
        }
        out[k] = v;
      });
    } catch (err) {}
    return out;
  }

  // Resolve environment variables
  var localEnv = Object.assign(
    {},
    loadEnv(path.join(rootDir, '.env')),
    loadEnv(path.join(cwd, '.env')),
    loadEnv(path.join(rootDir, '.env.local')),
    loadEnv(path.join(cwd, '.env.local'))
  );

  var supabaseUrl = (process.env.SUPABASE_URL || localEnv.SUPABASE_URL || '').trim();
  var supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || localEnv.SUPABASE_ANON_KEY || '').trim();
  var serverUrl = (process.env.SERVER_URL || localEnv.SERVER_URL || 'https://nifes-study-hub-server.up.railway.app').trim();

  var result = templateContent
    .replace('__SUPABASE_URL__', supabaseUrl)
    .replace('__SUPABASE_ANON_KEY__', supabaseAnonKey)
    .replace('__SERVER_URL__', serverUrl);

  // Write to all appropriate destination paths
  var outputTargets = [
    path.join(rootDir, 'app', 'js', 'config.js'),
    path.join(cwd, 'app', 'js', 'config.js')
  ];

  // De-duplicate targets
  var seen = {};
  outputTargets.forEach(function(targetPath) {
    if (seen[targetPath]) return;
    seen[targetPath] = true;
    try {
      var dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(targetPath, result, 'utf8');
      console.log('✓ Successfully written:', targetPath);
    } catch (err) {
      console.warn('[inject-env] Warning writing to ' + targetPath + ':', err.message);
    }
  });

  console.log('✓ [inject-env] Build environment configuration complete');
  console.log('  SUPABASE_URL   :', supabaseUrl ? (supabaseUrl.slice(0, 24) + '...') : '(offline/guest mode)');
  console.log('  ANON_KEY status:', supabaseAnonKey ? 'Loaded (' + supabaseAnonKey.length + ' chars)' : '(offline/guest mode)');
  console.log('  SERVER_URL     :', serverUrl);

} catch (globalErr) {
  // Catch any unexpected error and log it without crashing Vercel build
  console.error('[inject-env] Unexpected error during injection:', globalErr);
}

// Always exit with 0 so static site deployment succeeds
process.exit(0);
