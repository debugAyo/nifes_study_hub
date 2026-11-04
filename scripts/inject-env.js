/**
 * Production Environment Variable Injector
 * 
 * Automatically loads variables from:
 *   1. process.env (Vercel, Railway, CI/CD)
 *   2. .env / .env.local (local development, ignored by git)
 * 
 * Injects them into app/js/config.js via app/js/config.template.js.
 * Zero external dependencies required.
 * 
 * Usage: node scripts/inject-env.js
 */

var fs = require('fs');
var path = require('path');

var rootDir = path.join(__dirname, '..');
var templatePath = path.join(rootDir, 'app', 'js', 'config.template.js');
var outputPath = path.join(rootDir, 'app', 'js', 'config.js');

// Minimal, reliable .env parser (handles quotes, exports, and comments)
function loadEnvFile(filePath) {
  var env = {};
  if (!fs.existsSync(filePath)) return env;
  try {
    var lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    lines.forEach(function(line) {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      if (line.startsWith('export ')) line = line.substring(7).trim();
      var eq = line.indexOf('=');
      if (eq === -1) return;
      var key = line.substring(0, eq).trim();
      var val = line.substring(eq + 1).trim();
      // Remove surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      env[key] = val;
    });
  } catch (err) {
    console.warn('[inject-env] Warning: failed to parse ' + filePath, err.message);
  }
  return env;
}

// 1. Read local .env / .env.local
var localEnv = Object.assign({}, loadEnvFile(path.join(rootDir, '.env')), loadEnvFile(path.join(rootDir, '.env.local')));

// 2. Resolve variables: process.env (Vercel / system) takes precedence over .env file
var supabaseUrl = (process.env.SUPABASE_URL || localEnv.SUPABASE_URL || '').trim();
var supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || localEnv.SUPABASE_ANON_KEY || '').trim();
var serverUrl = (process.env.SERVER_URL || localEnv.SERVER_URL || 'https://nifes-study-hub-server.up.railway.app').trim();

// 3. Validation notice
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('\n⚠️  [inject-env] SUPABASE_URL or SUPABASE_ANON_KEY not set in .env or environment.');
  console.warn('   The app will run in offline/guest mode until environment variables are configured.');
  console.warn('   For local development: add them to .env (see .env.example).');
  console.warn('   For Vercel production: add them under Project Settings > Environment Variables.\n');
}

// 4. Generate app/js/config.js from template
if (!fs.existsSync(templatePath)) {
  console.error('[inject-env] Error: template not found at ' + templatePath);
  process.exit(1);
}

var template = fs.readFileSync(templatePath, 'utf8');
var config = template
  .replace('__SUPABASE_URL__', supabaseUrl)
  .replace('__SUPABASE_ANON_KEY__', supabaseAnonKey)
  .replace('__SERVER_URL__', serverUrl);

fs.writeFileSync(outputPath, config, 'utf8');

console.log('✓ app/js/config.js generated successfully');
console.log('  SUPABASE_URL   :', supabaseUrl ? (supabaseUrl.slice(0, 24) + '...') : '(not configured)');
console.log('  ANON_KEY status:', supabaseAnonKey ? 'Loaded (' + supabaseAnonKey.length + ' chars)' : '(not configured)');
console.log('  SERVER_URL     :', serverUrl);
