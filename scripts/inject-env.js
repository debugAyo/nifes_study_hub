/**
 * Environment variable injection script.
 * Run during build/deploy to generate app/js/config.js from
 * app/js/config.template.js using environment variables.
 *
 * Usage: node scripts/inject-env.js
 *
 * Required env vars:
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SERVER_URL
 */

var fs = require('fs');
var path = require('path');

var templatePath = path.join(__dirname, '..', 'app', 'js', 'config.template.js');
var outputPath = path.join(__dirname, '..', 'app', 'js', 'config.js');

var template = fs.readFileSync(templatePath, 'utf8');

var config = template
  .replace('__SUPABASE_URL__', process.env.SUPABASE_URL || '')
  .replace('__SUPABASE_ANON_KEY__', process.env.SUPABASE_ANON_KEY || '')
  .replace('__SERVER_URL__', process.env.SERVER_URL || 'http://localhost:3001');

fs.writeFileSync(outputPath, config);
console.log('✓ config.js generated from environment variables');
console.log('  SUPABASE_URL:', (process.env.SUPABASE_URL || '').slice(0, 20) + '…');
console.log('  SERVER_URL:', process.env.SERVER_URL || 'http://localhost:3001 (default)');
