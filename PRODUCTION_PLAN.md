# NIFES Study Hub — Production Readiness Plan

> **Goal:** Make the project deployable to production (Vercel for frontend, Railway/Render for backend).
> **Status:** All critical issues implemented. Ready for deployment.
> **Last updated:** 2026-07-08

---

## ✅ Completed

- **1a — Dynamic `SERVER_URL`**: `config.js` now detects localhost vs production and uses the correct backend URL
- **1b — Backend security**: Added JWT auth middleware, `helmet` security headers, restricted CORS, input validation on `/api/upload-extracted`, sanitized error messages
- **1c — `vercel.json`**: Created with SPA rewrites and security headers
- **1d — Env injection**: Created `config.template.js` + `scripts/inject-env.js` for build-time env var injection
- **1e — Loading states**: Added `showPageLoading()` overlay + `showContainerLoading()` spinner for async operations
- **3 — Rate limiting**: Added `express-rate-limit` (100 req/15min general, 20 extractions/hour)
- **4 — Polish**: Deleted `nifes-study-hub.html` and `error.txt`, fixed pagination bug (`pqPage` reset), created `404.html` and `favicon.svg`

## Table of Contents

1. [Critical Issues (Must Fix)](#1-critical-issues-must-fix)
   - [1a. Dynamic SERVER_URL for Production](#1a-dynamic-server_url-for-production)
   - [1b. Secure the Express Backend](#1b-secure-the-express-backend)
   - [1c. Create vercel.json for Frontend Deployment](#1c-create-verceljson-for-frontend-deployment)
   - [1d. Environment Variable Injection](#1d-environment-variable-injection)
   - [1e. Loading States for All Async Operations](#1e-loading-states-for-all-async-operations)
2. [Backend Deployment Strategy](#2-backend-deployment-strategy)
3. [Rate Limiting](#3-rate-limiting)
4. [Polish Items (Should Fix)](#4-polish-items-should-fix)
5. [Deployment Checklist](#5-deployment-checklist)
6. [Architecture Diagram](#6-architecture-diagram)

---

## 1. Critical Issues (Must Fix)

### ✅ 1a. Dynamic `SERVER_URL` for Production

**Problem:** `app/js/config.js` has this hardcoded:

```javascript
var SERVER_URL = 'http://localhost:3001';
```

When deployed, there is no `localhost`. The browser tries to fetch `http://localhost:3001/api/extract` from the user's computer — which fails.

**Fix:** Make `SERVER_URL` dynamic by detecting the environment.

**Implementation:**

In `app/js/config.js`, change to:

```javascript
var SERVER_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001'
  : 'https://your-backend-url.com';
```

> **Note:** Replace `https://your-backend-url.com` after deploying the backend (see Section 2).

Or create a separate `config.prod.js` that gets loaded in production via a build step or environment variable injection.

---

### ✅ 1b. Secure the Express Backend

**Problem:** The server at `server/routes/extract.js` has:
- No authentication — anyone can POST to `/api/extract` and `/api/upload-extracted`
- No input validation on batch inserts
- No rate limiting (covered in Section 3)
- Error messages leak raw stack traces (`res.status(500).json({ error: err.message })`)

**Fix — Auth Middleware:**

Create `server/middleware/auth.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');

async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) throw new Error('Invalid token');
    req.user = data.user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = { requireAuth };
```

**Fix — Update `server/index.js`:**

```javascript
const { requireAuth } = require('./middleware/auth');

// ... existing code ...

app.use('/api', requireAuth); // Locks ALL /api/* routes behind auth
app.use('/api', extractRoutes);

// Health endpoint stays open (no auth needed)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

**Fix — Update `server/routes/extract.js`:**

1. Add input validation to `upload-extracted`:
   - Validate `questions` is an array with at least 1 item
   - Validate each question has a `question` field (non-empty string)
   - Validate `level`, `course` are within allowed values
   - Limit batch size to 100 questions per request

2. Sanitize error messages — never send `err.message` directly to client:

```javascript
// Instead of:
res.status(500).json({ error: err.message });

// Do:
res.status(500).json({ error: 'Server error. Please try again later.' });
// And log the real error server-side:
console.error('[extract] error:', err);
```

3. Add CORS origin restriction in `server/index.js`:

```javascript
// Instead of:
app.use(cors());

// Do:
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:8000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

Add `helmet` for security headers:

```bash
npm install helmet
```

```javascript
const helmet = require('helmet');
app.use(helmet());
```

---

### ✅ 1c. Create `vercel.json` for Frontend Deployment

**Problem:** Vercel needs a configuration file to know how to serve the app. Without it:
- Visiting `/app/` directly returns 404
- No SPA routing support
- No headers or redirects configured

**Fix:** Create `vercel.json` at the project root:

```json
{
  "version": 2,
  "framework": null,
  "buildCommand": null,
  "outputDirectory": ".",
  "rewrites": [
    { "source": "/app/(.*)", "destination": "/app/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]
    }
  ]
}
```

**Vercel deployment settings:**
- **Framework Preset:** Other
- **Build Command:** (none)
- **Output Directory:** `.` (root)
- **Install Command:** (none)

---

### ✅ 1d. Environment Variable Injection

**Problem:** `app/js/config.js` contains hardcoded values for `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SERVER_URL`. These can't change between environments without manual editing.

**Fix — Option A (Recommended): Use Vercel Environment Variables + a small script.**

Create `app/js/config.template.js`:

```javascript
// NIFES Study Hub — Configuration (auto-generated from environment)
// This file is generated at deploy time. Do not edit directly.

var SUPABASE_URL = '__SUPABASE_URL__';
var SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
var SERVER_URL = '__SERVER_URL__';
```

Create `scripts/inject-env.js` (Node.js script run during build):

```javascript
const fs = require('fs');
const path = require('path');

const template = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'js', 'config.template.js'),
  'utf8'
);

const config = template
  .replace('__SUPABASE_URL__', process.env.SUPABASE_URL || '')
  .replace('__SUPABASE_ANON_KEY__', process.env.SUPABASE_ANON_KEY || '')
  .replace('__SERVER_URL__', process.env.SERVER_URL || 'http://localhost:3001');

fs.writeFileSync(
  path.join(__dirname, '..', 'app', 'js', 'config.js'),
  config
);

console.log('✓ config.js generated from environment variables');
```

Update `package.json` at project root (create if missing):

```json
{
  "name": "nifes-study-hub",
  "private": true,
  "scripts": {
    "build": "node scripts/inject-env.js",
    "start": "npx serve app"
  }
}
```

Then in Vercel, set environment variables:
- `SUPABASE_URL` = `https://inkclvlcajkyeigridkk.supabase.co`
- `SUPABASE_ANON_KEY` = `eyJhbGciOiJ...`
- `SERVER_URL` = `https://your-backend-url.com`

**Fix — Option B (Simpler):** Just use the `window.location.hostname` check from Section 1a in `config.js`, and manually maintain two versions. Less robust but faster.

---

### ✅ 1e. Loading States for All Async Operations

**Problem:** When the app fetches data (questions, materials, profile, users, bookmarks), the UI shows nothing until data arrives. On slow connections, users see a blank screen.

**Fix:**

1. **CSS Spinner** — Already exists in `styles.css` as `.spinner` class. Just use it.

2. **Add a reusable `showLoading()` / `hideLoading()` pattern** in `app.js`:

```javascript
function showLoading(containerId) {
  var el = document.getElementById(containerId);
  if (el) el.innerHTML = '<div class="spinner"></div><p style="text-align:center;color:var(--color-text-muted)">Loading…</p>';
}

function hideLoading(containerId) {
  // Container will be populated by the render function
}
```

3. **Add loading states to every async render function:**

| Function | Container | Loading State |
|----------|-----------|---------------|
| `renderDashboard()` | Dashboard cards | Show spinner in each KPI card until loaded |
| `renderPQList()` | `#pqList` | Show spinner while questions load |
| `renderMaterialsView()` | `#materialsList` | Show spinner while materials load |
| `renderProfileView()` | Profile sections | Show spinner while profile loads |
| `renderAdminUsers()` | `#adminUsersList` | Show spinner (replace the text "Loading users…") |
| `renderAdminQuestions()` | `#adminQuestionsList` | Show spinner while questions load |
| `renderAdminMaterials()` | `#adminMaterialsList` | Show spinner while materials load |
| `renderExtractedResults()` | `#extractResults` | Show spinner during extraction |

4. **Add a global loading overlay** (optional but nice):
   - Show a full-page overlay with spinner on initial page load after sign-in
   - Hide it when `loadAllData()` completes

---

## 2. Backend Deployment Strategy

**Problem:** The Express server uses `multer` with disk storage and `pdf-parse` which reads from the filesystem. This **cannot** run on Vercel Serverless Functions directly (no persistent filesystem).

**Solution:** Deploy the Express backend separately.

### Option A: Railway (Recommended)

[Railway](https://railway.app) has a free tier and works great with Node.js/Express apps.

**Steps:**

1. Push the `server/` directory to GitHub (or create a separate repo)
2. In Railway: **New Project → Deploy from GitHub repo**
3. Set these environment variables in Railway dashboard:
   - `SUPABASE_URL` = `https://inkclvlcajkyeigridkk.supabase.co`
   - `SUPABASE_ANON_KEY` = `<your-anon-key>`
   - `SUPABASE_SERVICE_KEY` = `<your-service-role-key>` (keep empty for now)
   - `CORS_ORIGIN` = `https://nifes-study-hub.vercel.app`
   - `PORT` = `3001`
4. Railway auto-detects the `npm start` script
5. You get a URL like `https://nifes-study-hub-server.up.railway.app`
6. Copy that URL into `config.js` as `SERVER_URL`

**Pricing:** Free tier includes $5/month credit (enough for a small app).

### Option B: Render

[Render](https://render.com) offers free web services that spin down after inactivity.

**Steps:**

1. Push the `server/` directory to GitHub
2. In Render: **New Web Service → Connect your repo**
3. Set:
   - **Name:** `nifes-study-hub-server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Add environment variables (same as Railway)
5. Deploy
6. Copy the Render URL into `config.js` as `SERVER_URL`

**Pricing:** Free tier spins down after 15 minutes of inactivity. Upgrade to $7/month for always-on.

### Option C: Supabase Edge Functions (Advanced)

Rewrite the PDF extraction as a [Supabase Edge Function](https://supabase.com/docs/guides/functions) using Deno. This eliminates the need for a separate server entirely:

```typescript
// supabase/functions/extract-pdf/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from 'https://deno.land/x/dom@v0.1.4-alpha/deno-dom-wasm/mod.ts'

serve(async (req) => {
  // Parse PDF, extract questions, insert into Supabase
  // Uses Supabase's internal service key automatically
})
```

**Pros:** No separate server, no billing, scales automatically.
**Cons:** PDF parsing in Deno requires different libraries than `pdf-parse` (Node.js native addon).

---

## 3. Rate Limiting

**Problem:** The backend has no rate limiting. Malicious users could flood the API, running up your server bill.

**Fix:** Add `express-rate-limit` to the Express backend.

**Install:**

```bash
cd server
npm install express-rate-limit
```

**Add to `server/index.js`:**

```javascript
const rateLimit = require('express-rate-limit');

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                   // 100 requests per window
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for extraction endpoints
const extractLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,                   // 20 PDF extractions per hour
  message: { error: 'Extraction limit reached. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);            // All API routes
app.use('/api/extract', extractLimiter); // Stricter for PDF extraction
```

---

## 4. Polish Items (Should Fix)

These are not blockers but should be done before launch:

### 4a. Clean Up Orphaned Files

- **Delete** `nifes-study-hub.html` — dead duplicate prototype
- **Delete** `error.txt` — debug log file accidentally committed
- **Add** `error.txt` to `.gitignore`

### 4b. Fix Pagination Bug

**Problem:** `pqPage` state is not reset when switching levels. If you scroll to page 3 in 100L, then switch to 200L, it starts at page 3 instead of page 1.

**Fix in `app.js`:**

```javascript
function navigatePQ(level) {
  currentLevel = level;
  pqPage = 1; // Reset pagination
  navigate('pq');
  // ... rest of function
}
```

### 4c. Add 404 Page

Create `404.html` at root:

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head><meta charset="UTF-8"><title>Page Not Found — NIFES Study Hub</title>
<link rel="stylesheet" href="app/css/styles.css">
<style>
  .notfound { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; text-align:center; padding:2rem; }
  .notfound h1 { font-size:4rem; margin-bottom:1rem; }
  .notfound p { color:var(--color-text-muted); margin-bottom:2rem; }
</style>
</head>
<body>
<div class="notfound">
  <h1>404</h1>
  <p>Page not found. The link might be broken, or the page has moved.</p>
  <a href="/app/" class="btn-primary">Go to Study Hub</a>
</div>
</body>
</html>
```

### 4d. Add Favicon

Place a `favicon.ico` in the project root. You can generate one from the NIFES logo SVG.

### 4e. Add Security Headers on Backend

In `server/index.js`:

```javascript
const helmet = require('helmet');
app.use(helmet());
```

### 4f. Fix Material File Type Mismatch

In `app.js`, update the file validation to match the HTML `accept` attribute:

```javascript
// Currently only allows: application/pdf, image/png, image/jpeg
// HTML accept also allows: .doc, .docx, .ppt, .pptx, .txt
// Fix — allow all types or make them match
var allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain'];
```

### 4g. Add `favicon.ico` to Logs

Suppress the favicon 404 by adding a route or a favicon file.

---

## 5. Deployment Checklist

### Phase 1: Backend First

- [ ] Secure Express backend (auth middleware + helmet)
- [ ] Add rate limiting
- [ ] Add input validation to `/api/upload-extracted`
- [ ] Sanitize error messages (don't leak stack traces)
- [ ] Restrict CORS origin
- [ ] Push `server/` to GitHub
- [ ] Deploy server to Railway or Render
- [ ] Test: `curl https://your-backend-url.com/api/health`
- [ ] Test: POST a PDF to `/api/extract` with a valid auth token
- [ ] Note the deployed URL

### Phase 2: Frontend

- [ ] Create `vercel.json`
- [ ] Fix `SERVER_URL` to be dynamic
- [ ] Add loading states to all async operations
- [ ] Fix pagination bug (`pqPage` reset)
- [ ] Delete orphaned files (`nifes-study-hub.html`, `error.txt`)
- [ ] Create 404 page
- [ ] Add favicon
- [ ] Push to GitHub
- [ ] Import repo to Vercel
- [ ] Set environment variables in Vercel dashboard
- [ ] Deploy

### Phase 3: Verification

- [ ] Visit Vercel URL — landing page loads
- [ ] Sign up / Sign in works
- [ ] Dashboard shows questions
- [ ] Past questions load with pagination
- [ ] Quiz mode works
- [ ] Materials upload works
- [ ] PDF extraction works (test with the deployed backend URL)
- [ ] Admin Panel shows for `admin`/`superuser` roles
- [ ] Role changes work for `superuser`
- [ ] Profile page shows correct role
- [ ] Calculator / CGPA calculator work
- [ ] Bookmark toggle works
- [ ] Dark/light theme switch works
- [ ] Mobile responsive layout renders correctly
- [ ] 404 page appears for unknown routes

---

## 6. Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                   Browser                            │
│  (Vercel — Static Hosting)                          │
│                                                      │
│  index.html  ───►   Landing Page                     │
│  app/index.html ──►  Study Hub (SPA)                │
│       │                                              │
│       ├──► Supabase (direct — anon key + RLS)        │
│       │    ├── questions                             │
│       │    ├── materials                             │
│       │    ├── profiles                              │
│       │    ├── bookmarks                             │
│       │    └── quiz_sessions                         │
│       │                                              │
│       └──► Backend API (Railway/Render)              │
│            ├── POST /api/extract     (PDF parsing)   │
│            └── POST /api/upload-extracted (batch)    │
│                                                      │
├─────────────────────────────────────────────────────┤
│              Supabase (Database + Auth)               │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐   │
│  │ Auth     │  │ Database │  │ Storage           │   │
│  │ (users)  │  │ (RLS)    │  │ study-materials   │   │
│  └──────────┘  └──────────┘  └───────────────────┘   │
│                                                      │
│  Row-Level Security (RLS) enforces role checks       │
│  at the database level for all direct queries.       │
├─────────────────────────────────────────────────────┤
│            Express Backend (Railway/Render)           │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐   │
│  │ Auth MW  │  │ Rate     │  │ PDF Extraction    │   │
│  │ (JWT)    │  │ Limiting │  │ + Question Parse  │   │
│  └──────────┘  └──────────┘  └───────────────────┘   │
│                                                      │
│  All API requests go through:                        │
│  1. Rate limiter (100 req/15min, 20 extract/hr)     │
│  2. JWT auth middleware (validates Supabase token)   │
│  3. Input validation                                 │
│  4. Helmet security headers                          │
└─────────────────────────────────────────────────────┘
```

---

## Reference: Environment Variables

| Variable | Where Used | Purpose |
|----------|-----------|---------|
| `SUPABASE_URL` | Frontend + Backend | Supabase project URL |
| `SUPABASE_ANON_KEY` | Frontend + Backend | Public anon key (safe to expose) |
| `SUPABASE_SERVICE_KEY` | Backend only | Service role key (DO NOT expose to frontend) |
| `SERVER_URL` | Frontend | Backend API URL |
| `CORS_ORIGIN` | Backend | Allowed frontend origin |
| `PORT` | Backend | Server port (default 3001) |

---

## Reference: Supabase RLS After Fix

The `app_get_role()` helper function is now in place. All recursive policies have been replaced with `security definer` function calls. This is the current correct state:

```sql
-- Helper (bypasses RLS recursion)
create or replace function app_get_role()
returns text language sql security definer stable
as $$ select role from profiles where id = auth.uid(); $$;

-- Profiles
--   SELECT: self OR admin/superuser
--   UPDATE (self): any user can update own name
--   UPDATE (role): only superuser

-- Questions
--   UPDATE/DELETE: owner OR admin/superuser

-- Materials
--   UPDATE/DELETE: owner OR admin/superuser

-- Storage
--   DELETE: owner OR admin/superuser
```

> **Note:** If you ever re-run `migration_v2.sql`, it will recreate the old recursive policies. After that, re-apply the fix SQL to restore the non-recursive versions.
