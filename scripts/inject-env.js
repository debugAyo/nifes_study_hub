/**
 * Environment variable injection script.
 * Run during build/deploy to generate app/js/config.js from
 * app/js/config.template.js using environment variables.
 *
 * Usage: node scripts/inject-env.js
 */

var fs = require('fs');
var path = require('path');

var templatePath = path.join(__dirname, '..', 'app', 'js', 'config.template.js');
var outputPath = path.join(__dirname, '..', 'app', 'js', 'config.js');

// Try reading existing config to avoid wiping credentials on local builds
var existingUrl = '';
var existingAnon = '';
if (fs.existsSync(outputPath)) {
  var content = fs.readFileSync(outputPath, 'utf8');
  var mUrl = content.match(/var SUPABASE_URL = '([^']+)';/);
  var mKey = content.match(/var SUPABASE_ANON_KEY = '([^']+)';/);
  if (mUrl && mUrl[1]) existingUrl = mUrl[1];
  if (mKey && mKey[1]) existingAnon = mKey[1];
}

var template = fs.readFileSync(templatePath, 'utf8');

var supabaseUrl = process.env.SUPABASE_URL || existingUrl || 'https://inkclvlcajkyeigridkk.supabase.co';
var supabaseAnonKey = process.env.SUPABASE_ANON_KEY || existingAnon || '';
var serverUrl = process.env.SERVER_URL || 'https://nifes-study-hub-server.up.railway.app';

var config = template
  .replace('__SUPABASE_URL__', supabaseUrl)
  .replace('__SUPABASE_ANON_KEY__', supabaseAnonKey)
  .replace('__SERVER_URL__', serverUrl);

fs.writeFileSync(outputPath, config);
console.log('✓ config.js generated');
console.log('  SUPABASE_URL:', supabaseUrl ? (supabaseUrl.slice(0, 20) + '…') : '(empty)');
console.log('  SERVER_URL:', serverUrl);
